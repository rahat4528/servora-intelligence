import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ApprovalsService } from '../src/approvals/approvals.service';
import { CalQuickModule } from '../src/integrations/calquick/calquick.module';
import { AuditModule } from '../src/audit/audit.module';
import { TenantsModule } from '../src/tenants/tenants.module';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Phase 7 — Human-Approved Actions & Idempotency Suite', () => {
  let service: ApprovalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), CalQuickModule, AuditModule, TenantsModule],
      providers: [ApprovalsService, StructuredLoggerService],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  describe('Refund Proposal Preparation (Read-Only Proposal)', () => {
    it('creates a PENDING proposal for valid order without executing financial movement', async () => {
      const proposal = await service.prepareRefundProposal(
        {
          conversationId: 'conv-101',
          orderId: 'CQ-9821', // totalAmount: 145.0
          customerId: 'cust-1',
          amount: 50,
          reason: 'Product arrived with damaged outer frame and cracked lens',
          evidence: 'Customer photo upload URL: https://s3.servora.local/evidence/123.jpg',
        },
        'tenant-default',
        'agent-007',
      );

      expect(proposal).toBeDefined();
      expect(proposal.id).toMatch(/^prop-/);
      expect(proposal.status).toBe('PENDING');
      expect(proposal.policyEligibility.eligible).toBe(true);
      expect(proposal.policyEligibility.riskLevel).toBe('LOW');
      expect(proposal.idempotencyKey).toBeDefined();
      expect(proposal.executionResult).toBeUndefined(); // Zero financial execution at this step
    });

    it('rejects proposal when refund amount exceeds total order amount', async () => {
      await expect(
        service.prepareRefundProposal(
          {
            conversationId: 'conv-102',
            orderId: 'CQ-9821',
            customerId: 'cust-1',
            amount: 999999, // Exceeds 145 total
            reason: 'Excessive refund test',
            evidence: 'none',
          },
          'tenant-default',
          'agent-007',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects proposal if order does not exist or belongs to another tenant', async () => {
      await expect(
        service.prepareRefundProposal(
          {
            conversationId: 'conv-103',
            orderId: 'CQ-NONEXISTENT',
            customerId: 'cust-x',
            amount: 50,
            reason: 'Test',
            evidence: 'none',
          },
          'tenant-default',
          'agent-007',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Autonomous Execution Prevention & Role Enforcement', () => {
    it('strictly forbids AI or agent from executing a PENDING proposal without human manager approval', async () => {
      const proposal = await service.prepareRefundProposal(
        {
          conversationId: 'conv-201',
          orderId: 'CQ-9821',
          customerId: 'cust-1',
          amount: 60,
          reason: 'Defective cable',
          evidence: 'Customer reported issue',
        },
        'tenant-default',
        'ai_assistant',
      );

      // Attempt execution directly while PENDING with manager role
      await expect(
        service.executeRefund(
          proposal.id,
          'idempotency-key-early',
          'tenant-default',
          'manager-1',
          'SUPPORT_MANAGER',
        ),
      ).rejects.toThrow(BadRequestException);

      // Verify proposal remains PENDING
      const current = await service.getProposal(proposal.id, 'tenant-default');
      expect(current.status).toBe('PENDING');
    });

    it('forbids SUPPORT_AGENT role from approving proposals', async () => {
      const proposal = await service.prepareRefundProposal(
        {
          conversationId: 'conv-202',
          orderId: 'CQ-9821',
          customerId: 'cust-1',
          amount: 40,
          reason: 'Defective item',
          evidence: 'Photo',
        },
        'tenant-default',
        'agent-1',
      );

      await expect(
        service.reviewProposal(
          proposal.id,
          { action: 'APPROVE', reviewNotes: 'Self-approving agent' },
          'tenant-default',
          'agent-1',
          'SUPPORT_AGENT',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids SUPPORT_AGENT role from executing approved proposals', async () => {
      const proposal = await service.prepareRefundProposal(
        {
          conversationId: 'conv-203',
          orderId: 'CQ-9821',
          customerId: 'cust-1',
          amount: 40,
          reason: 'Defective item',
          evidence: 'Photo',
        },
        'tenant-default',
        'agent-1',
      );

      // Manager approves
      await service.reviewProposal(
        proposal.id,
        { action: 'APPROVE', reviewNotes: 'Approved by manager' },
        'tenant-default',
        'mgr-1',
        'SUPPORT_MANAGER',
      );

      // Agent tries to execute
      await expect(
        service.executeRefund(
          proposal.id,
          'key-agent-exec',
          'tenant-default',
          'agent-1',
          'SUPPORT_AGENT',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Approval Flow & Idempotent Execution', () => {
    it('executes an approved refund idempotently and prevents double refunds', async () => {
      // 1. Prepare proposal
      const proposal = await service.prepareRefundProposal(
        {
          conversationId: 'conv-301',
          orderId: 'CQ-9821',
          customerId: 'cust-1',
          amount: 75,
          reason: 'Late courier compensation',
          evidence: 'SLA breached by 4 days',
        },
        'tenant-default',
        'agent-1',
      );

      // 2. Manager approves
      const approved = await service.reviewProposal(
        proposal.id,
        { action: 'APPROVE', reviewNotes: 'Approved per SLA policy' },
        'tenant-default',
        'mgr-1',
        'SUPPORT_MANAGER',
      );
      expect(approved.status).toBe('APPROVED');
      expect(approved.reviewedBy).toBe('mgr-1');

      // 3. Execute with idempotency key
      const idempotencyKey = 'idemp-uuid-12345';
      const executed = await service.executeRefund(
        proposal.id,
        idempotencyKey,
        'tenant-default',
        'mgr-1',
        'SUPPORT_MANAGER',
      );

      expect(executed.status).toBe('EXECUTED');
      expect(executed.executionResult?.success).toBe(true);
      expect(executed.executionResult?.externalTransactionId).toMatch(/^TXN-REF-/);

      const firstTxnId = executed.executionResult?.externalTransactionId;

      // 4. Duplicate request with the SAME idempotency key must return existing result without new charge
      const duplicateExecution = await service.executeRefund(
        proposal.id,
        idempotencyKey,
        'tenant-default',
        'mgr-1',
        'SUPPORT_MANAGER',
      );

      expect(duplicateExecution.status).toBe('EXECUTED');
      expect(duplicateExecution.executionResult?.externalTransactionId).toBe(firstTxnId);

      // 5. Subsequent request with a DIFFERENT idempotency key must be strictly rejected
      await expect(
        service.executeRefund(
          proposal.id,
          'different-idempotency-key',
          'tenant-default',
          'mgr-1',
          'SUPPORT_MANAGER',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects execution if proposal was rejected by manager', async () => {
      const proposal = await service.prepareRefundProposal(
        {
          conversationId: 'conv-302',
          orderId: 'CQ-9821',
          customerId: 'cust-1',
          amount: 30,
          reason: 'Minor packaging scratch',
          evidence: 'Visual only',
        },
        'tenant-default',
        'agent-1',
      );

      await service.reviewProposal(
        proposal.id,
        { action: 'REJECT', reviewNotes: 'Item is fully functional, offer store credit instead' },
        'tenant-default',
        'mgr-1',
        'SUPPORT_MANAGER',
      );

      await expect(
        service.executeRefund(
          proposal.id,
          'key-rejected-exec',
          'tenant-default',
          'mgr-1',
          'SUPPORT_MANAGER',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('isolates refund proposals between tenants', async () => {
      const propTenantA = await service.prepareRefundProposal(
        {
          conversationId: 'conv-401',
          orderId: 'CQ-9821',
          customerId: 'cust-1',
          amount: 50,
          reason: 'Test A',
          evidence: 'evA',
        },
        'tenant-default',
        'agent-default',
      );

      // Tenant Beta cannot view Tenant Default's proposal
      await expect(service.getProposal(propTenantA.id, 'tenant-isolated')).rejects.toThrow(
        NotFoundException,
      );

      // Tenant Beta cannot approve Tenant Default's proposal
      await expect(
        service.reviewProposal(
          propTenantA.id,
          { action: 'APPROVE' },
          'tenant-isolated',
          'mgr-isolated',
          'SUPPORT_MANAGER',
        ),
      ).rejects.toThrow(NotFoundException);

      // Tenant Beta list should not contain Tenant Default's proposal
      const betaList = await service.listProposals('tenant-isolated');
      expect(betaList.find((p) => p.id === propTenantA.id)).toBeUndefined();
    });
  });
});
