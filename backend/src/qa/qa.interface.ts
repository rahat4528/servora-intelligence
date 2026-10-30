export type QaDimension =
  | 'accuracy'
  | 'policyCompliance'
  | 'resolutionQuality'
  | 'empathyTone'
  | 'clarityConciseness'
  | 'citationQuality'
  | 'toolCorrectness'
  | 'safetyBoundaries';

export interface DimensionScore {
  score: number; // 1 to 5
  rationale: string;
  evidenceSnippet?: string;
}

export interface QaFlags {
  safetyBreach: boolean;
  policyBreach: boolean;
  lowEmpathy: boolean;
  explanation?: string;
}

export interface CoachingNotes {
  strengths: string[];
  improvements: string[];
  suggestedAlternativePhrasing?: string;
  recommendedPolicyReference?: string;
}

export type QaEvaluationStatus =
  | 'AI_EVALUATED'
  | 'MANAGER_VERIFIED'
  | 'DISPUTED'
  | 'OVERTURNED';

export interface QaEvaluation {
  id: string;
  tenantId: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  overallScore: number; // 1.0 to 5.0
  dimensions: Record<QaDimension, DimensionScore>;
  flags: QaFlags;
  coachingNotes: CoachingNotes;
  status: QaEvaluationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  managerAdjustments?: Partial<Record<QaDimension, number>>;
  disputeNotes?: string;
  createdAt: string;
}

export interface EvaluateConversationDto {
  conversationId: string;
  agentId: string;
  agentName?: string;
  customerMessage: string;
  agentReply: string;
  intent: string;
  toolsUsed?: string[];
  citationsUsed?: string[];
  policyRules?: string;
}

export interface ReviewQaDto {
  action: 'AGREE' | 'ADJUST' | 'OVERTURN';
  adjustedScores?: Partial<Record<QaDimension, number>>;
  reviewNotes: string;
}

export interface DisputeQaDto {
  reason: string;
}

export interface AgentCoachingSummary {
  agentId: string;
  tenantId: string;
  totalEvaluations: number;
  averageScore: number;
  dimensionAverages: Record<QaDimension, number>;
  topStrengths: string[];
  growthAreas: string[];
}
