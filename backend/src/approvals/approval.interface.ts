export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED';

export type ActionType = 'REFUND' | 'ORDER_CANCELLATION' | 'ADDRESS_CHANGE';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PolicyEligibility {
  eligible: boolean;
  policyReference: string;
  explanation: string;
  riskLevel: RiskLevel;
}

export interface RefundProposal {
  id: string;
  tenantId: string;
  conversationId: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: string;
  evidence: string;
  policyEligibility: PolicyEligibility;
  status: ApprovalStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  idempotencyKey: string;
  executionResult?: {
    success: boolean;
    externalTransactionId?: string;
    error?: string;
    executedAt?: string;
  };
}

export interface PrepareRefundDto {
  conversationId: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency?: string;
  reason: string;
  evidence: string;
}

export interface ReviewProposalDto {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reviewNotes?: string;
}

