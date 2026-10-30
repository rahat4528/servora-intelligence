export interface OperationalKpis {
  resolutionRate: number; // percentage 0 - 100
  firstContactResolutionRate: number; // percentage 0 - 100
  escalationRate: number; // percentage 0 - 100
  medianFirstResponseSeconds: number;
  medianResolutionMinutes: number;
  totalTickets: number;
  sampleSize: number;
  windowDays: number;
}

export interface AiPerformanceKpis {
  citationAccuracy: number; // percentage 0 - 100
  hallucinationRate: number; // percentage 0 - 100
  toolSuccessRate: number; // percentage 0 - 100
  routingAgreementRate: number; // percentage 0 - 100
  guardrailTriggerCount: number;
  averageQaScore: number; // 1.0 - 5.0
  draftAcceptanceRate: number; // percentage 0 - 100
  sampleSize: number;
}

export interface CostIntelligence {
  totalSpendTodayUsd: number;
  totalSpendMonthUsd: number;
  projectedMonthSpendUsd: number;
  averageCostPerTicketUsd: number;
  p95CostPerTicketUsd: number;
  spendByProvider: Record<string, number>;
  budgetConsumedPercent: number;
}

export interface VolumeBreakdown {
  byIntent: Record<string, number>;
  byLanguage: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface ModelComparisonRow {
  modelName: string;
  provider: string;
  accuracy: number;
  groundedness: number;
  banglaMrr: number;
  banglishMrr: number;
  avgLatencyMs: number;
  costPer1kTokensUsd: number;
  regressionDetected: boolean;
}

export interface GoldenEvalBenchmarkReport {
  models: ModelComparisonRow[];
  totalGoldenCases: number;
  testedAt: string;
}

export interface FullAnalyticsDashboard {
  tenantId: string;
  windowDays: number;
  operational: OperationalKpis;
  aiPerformance: AiPerformanceKpis;
  cost: CostIntelligence;
  volume: VolumeBreakdown;
  goldenEval: GoldenEvalBenchmarkReport;
  generatedAt: string;
}
