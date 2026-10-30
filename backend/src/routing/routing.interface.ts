export interface AgentProfile {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  skills: string[]; // e.g. ['refunds', 'logistics', 'technical', 'vip']
  languages: string[]; // e.g. ['en', 'bn', 'bn-Latn']
  currentWorkload: number;
  maxCapacity: number;
  historicalCsat: number; // 1.0 - 5.0
  available: boolean;
}

export type CustomerTier = 'STANDARD' | 'VIP';

export interface RoutingSignals {
  conversationId: string;
  tenantId: string;
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  language: 'en' | 'bn' | 'bn-Latn' | 'mixed';
  customerTier: CustomerTier;
  slaBufferMinutes: number;
}

export interface AgentScoreBreakdown {
  skillMatch: number;
  capacityScore: number;
  languageMatch: number;
  urgencyBonus: number;
  csatFactor: number;
}

export interface AgentCandidateScore {
  agentId: string;
  agentName: string;
  totalScore: number; // 0 to 1
  breakdown: AgentScoreBreakdown;
  eligible: boolean;
  exclusionReason?: string;
}

export type SlaRisk = 'NONE' | 'LOW' | 'HIGH' | 'CRITICAL';

export interface RoutingRecommendation {
  conversationId: string;
  tenantId: string;
  selectedAgentId: string | null;
  selectedAgentName: string | null;
  confidence: number;
  rationale: string;
  alternatives: AgentCandidateScore[];
  predictedResolutionMinutes: number;
  slaRisk: SlaRisk;
  mode: 'SHADOW' | 'ACTIVE';
  fallbackApplied: boolean;
  fallbackReason?: string;
  createdAt: string;
}

export interface ManualOverrideDto {
  conversationId: string;
  targetAgentId: string;
  reason: string;
}
