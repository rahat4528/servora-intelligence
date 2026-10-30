import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  RefundProposal,
  PrepareRefundDto,
  ReviewProposalDto,
  ApprovalStatus,
  PolicyEligibility,
} from './approval.interface';
import { CalQuickService } from '../integrations/calquick/calquick.service';
import { AuditService } from '../audit/audit.service';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Injectable()
export class ApprovalsService {
  private proposals: Map<string, RefundProposal> = new Map();
  private idempotencyRegistry: Map<string, RefundProposal> = new Map();

  constructor(
    private readonly calquickService: CalQuickService,
    private readonly auditService: AuditService,
    private readonly logger: StructuredLoggerService,
  ) {}

  /**
   * Prepares a typed draft proposal. NEVER executes financial movements autonomously.
   */
  async prepareRefundProposal(
    dto: PrepareRefundDto,
    tenantId: string,
    userId: string,
  ): Promise<RefundProposal> {
    this.logger.log(
      `Preparing refund proposal for order ${dto.orderId}`,
      'ApprovalsService',
      { tenantId, userId, metadata: { orderId: dto.orderId, amount: dto.amount } },
    );

    // 1. Verify order in CalQuick
    const order = await this.calquickService.lookupOrder(dto.orderId, tenantId);
    if (!order) {
      throw new NotFoundException(`Order '${dto.orderId}' not found for tenant '${tenantId}'`);
    }

    // 2. Validate order state for refund eligibility
    if (dto.amount > order.totalAmount) {
      throw new BadRequestException(
        `Refund amount (${dto.amount}) exceeds order total (${order.totalAmount})`,
      );
    }

    if (order.orderStatus === 'CANCELLED') {
      throw new BadRequestException(`Order '${dto.orderId}' is already cancelled`);
    }

    if (order.paymentStatus === 'REFUNDED') {
      throw new BadRequestException(`Order '${dto.orderId}' is already fully refunded`);
    }

    // 3. Evaluate eligibility against policy
    const policyEligibility: PolicyEligibility = this.evaluatePolicy(order, dto.amount, dto.reason);

    // 4. Generate unique proposal ID & canonical idempotency key
    const proposalId = `prop-${crypto.randomBytes(8).toString('hex')}`;
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${tenantId}:${dto.orderId}:${proposalId}:${dto.amount}`)
      .digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48-hour expiration

    const proposal: RefundProposal = {
      id: proposalId,
      tenantId,
      conversationId: dto.conversationId,
      orderId: dto.orderId,
      customerId: dto.customerId,
      amount: dto.amount,
      currency: dto.currency || order.currency || 'BDT',
      reason: dto.reason,
      evidence: dto.evidence,
      policyEligibility,
      status: 'PENDING',
      createdBy: userId,
      createdAt: now.toISOString(),
      expiresAt,
      idempotencyKey,
    };

    this.proposals.set(proposalId, proposal);

    // 5. Audit event
    await this.auditService.recordEvent({
      tenantId,
      userId,
      eventType: 'REFUND_PROPOSAL_CREATED',
      resourceType: 'refund_proposal',
      resourceId: proposalId,
      action: 'CREATE',
      details: {
        orderId: dto.orderId,
        amount: dto.amount,
        riskLevel: policyEligibility.riskLevel,
        eligible: policyEligibility.eligible,
      },
    });

    return proposal;
  }

  /**
   * Reviews a proposal (APPROVE, REJECT, REQUEST_CHANGES). Requires manager or admin.
   */
  async reviewProposal(
    proposalId: string,
    dto: ReviewProposalDto,
    tenantId: string,
    reviewerId: string,
    reviewerRole: string,
  ): Promise<RefundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.tenantId !== tenantId) {
      throw new NotFoundException(`Proposal '${proposalId}' not found`);
    }

    // Strict role check: Agents cannot approve refund proposals
    if (reviewerRole !== 'SUPPORT_MANAGER' && reviewerRole !== 'TENANT_ADMIN') {
      throw new ForbiddenException(
        `Reviewer role '${reviewerRole}' is not authorized to approve refund proposals. Requires SUPPORT_MANAGER or TENANT_ADMIN.`,
      );
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot review proposal in status '${proposal.status}'. Must be 'PENDING'.`,
      );
    }

    // Check expiration
    if (new Date() > new Date(proposal.expiresAt)) {
      proposal.status = 'EXPIRED';
      throw new BadRequestException(`Proposal '${proposalId}' has expired`);
    }

    const nextStatus: ApprovalStatus =
      dto.action === 'APPROVE'
        ? 'APPROVED'
        : dto.action === 'REJECT'
        ? 'REJECTED'
        : 'CHANGES_REQUESTED';

    proposal.status = nextStatus;
    proposal.reviewedBy = reviewerId;
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewNotes = dto.reviewNotes;

    await this.auditService.recordEvent({
      tenantId,
      userId: reviewerId,
      eventType: `REFUND_PROPOSAL_${nextStatus}`,
      resourceType: 'refund_proposal',
      resourceId: proposalId,
      action: 'REVIEW',
      details: {
        action: dto.action,
        reviewNotes: dto.reviewNotes,
        amount: proposal.amount,
        orderId: proposal.orderId,
      },
    });

    return proposal;
  }

  /**
   * Submits an approved refund for execution. Enforces strict idempotency and manager credentials.
   */
  async executeRefund(
    proposalId: string,
    idempotencyKey: string,
    tenantId: string,
    executorId: string,
    executorRole: string,
  ): Promise<RefundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.tenantId !== tenantId) {
      throw new NotFoundException(`Proposal '${proposalId}' not found`);
    }

    // Role check
    if (executorRole !== 'SUPPORT_MANAGER' && executorRole !== 'TENANT_ADMIN') {
      throw new ForbiddenException(
        `Executor role '${executorRole}' is not authorized to execute refunds. Requires SUPPORT_MANAGER or TENANT_ADMIN.`,
      );
    }

    // Strict state verification: AI or agent CANNOT execute unapproved refunds
    if (proposal.status === 'PENDING') {
      throw new BadRequestException(
        `Cannot execute refund: Proposal '${proposalId}' is in 'PENDING' status and has not received human manager approval.`,
      );
    }

    if (proposal.status === 'REJECTED' || proposal.status === 'EXPIRED') {
      throw new BadRequestException(
        `Cannot execute refund: Proposal '${proposalId}' is in '${proposal.status}' status.`,
      );
    }

    // Idempotency check: If already executed with matching idempotency key, return existing execution
    if (proposal.status === 'EXECUTED') {
      const existing = this.idempotencyRegistry.get(idempotencyKey);
      if (existing && existing.id === proposalId) {
        this.logger.log(
          `Idempotent duplicate refund request detected for proposal ${proposalId}`,
          'ApprovalsService',
          { tenantId, metadata: { proposalId, idempotencyKey } },
        );
        return proposal;
      }
      throw new BadRequestException(
        `Proposal '${proposalId}' has already been executed. Duplicate executions under a different key are prohibited.`,
      );
    }

    if (proposal.status !== 'APPROVED') {
      throw new BadRequestException(
        `Proposal '${proposalId}' cannot be executed from status '${proposal.status}'.`,
      );
    }

    // Check if idempotency key is already registered for another proposal
    if (this.idempotencyRegistry.has(idempotencyKey)) {
      const registered = this.idempotencyRegistry.get(idempotencyKey);
      if (registered?.id !== proposalId) {
        throw new BadRequestException(
          `Idempotency key '${idempotencyKey}' was already used for proposal '${registered?.id}'.`,
        );
      }
    }

    // Mark as executing
    proposal.status = 'EXECUTING';

    try {
      // Simulate CalQuick external refund transaction (mock sandbox)
      const externalTxnId = `TXN-REF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

      proposal.status = 'EXECUTED';
      proposal.executionResult = {
        success: true,
        externalTransactionId: externalTxnId,
        executedAt: new Date().toISOString(),
      };

      // Register idempotency key
      this.idempotencyRegistry.set(idempotencyKey, proposal);

      // Audit log
      await this.auditService.recordEvent({
        tenantId,
        userId: executorId,
        eventType: 'REFUND_EXECUTED',
        resourceType: 'refund_proposal',
        resourceId: proposalId,
        action: 'EXECUTE',
        details: {
          orderId: proposal.orderId,
          amount: proposal.amount,
          externalTransactionId: externalTxnId,
          idempotencyKey,
        },
      });

      this.logger.log(
        `Refund successfully executed for proposal ${proposalId}: ${externalTxnId}`,
        'ApprovalsService',
        { tenantId, userId: executorId, metadata: { proposalId, externalTxnId } },
      );

      return proposal;
    } catch (err: any) {
      proposal.status = 'FAILED';
      proposal.executionResult = {
        success: false,
        error: err.message || 'External refund execution failed',
        executedAt: new Date().toISOString(),
      };

      await this.auditService.recordEvent({
        tenantId,
        userId: executorId,
        eventType: 'REFUND_EXECUTION_FAILED',
        resourceType: 'refund_proposal',
        resourceId: proposalId,
        action: 'EXECUTE_FAILED',
        details: {
          orderId: proposal.orderId,
          error: err.message,
        },
      });

      throw err;
    }
  }

  async listProposals(tenantId: string, status?: ApprovalStatus): Promise<RefundProposal[]> {
    return Array.from(this.proposals.values())
      .filter((p) => p.tenantId === tenantId)
      .filter((p) => (status ? p.status === status : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getProposal(proposalId: string, tenantId: string): Promise<RefundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.tenantId !== tenantId) {
      throw new NotFoundException(`Proposal '${proposalId}' not found`);
    }
    return proposal;
  }

  private evaluatePolicy(order: any, amount: number, reason: string): PolicyEligibility {
    // Basic heuristic rules
    if (amount > 10000) {
      return {
        eligible: false,
        policyReference: 'POL-REF-04 (High-value transaction ceiling)',
        explanation: 'Refund requests exceeding 10,000 BDT require executive approval.',
        riskLevel: 'HIGH',
      };
    }

    if (reason.toLowerCase().includes('damaged') || reason.toLowerCase().includes('defective')) {
      return {
        eligible: true,
        policyReference: 'POL-REF-01 (Damaged on arrival)',
        explanation: 'Standard 7-day defective product replacement or full refund eligibility.',
        riskLevel: 'LOW',
      };
    }

    if (reason.toLowerCase().includes('delayed') || reason.toLowerCase().includes('courier')) {
      return {
        eligible: true,
        policyReference: 'POL-REF-02 (Courier SLA breach compensation)',
        explanation: 'Eligible for delivery fee refund or partial voucher concession.',
        riskLevel: 'MEDIUM',
      };
    }

    return {
      eligible: true,
      policyReference: 'POL-REF-03 (Standard customer goodwill exception)',
      explanation: 'Eligible under standard goodwill policy with manager signoff.',
      riskLevel: amount > 3000 ? 'MEDIUM' : 'LOW',
    };
  }
}
