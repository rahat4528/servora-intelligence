import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { InboxModule } from '../src/inbox/inbox.module';
import { QaModule } from '../src/qa/qa.module';
import { AiModule } from '../src/ai/ai.module';
import { AuditModule } from '../src/audit/audit.module';
import { AuthModule } from '../src/auth/auth.module';
import { TenancyModule } from '../src/common/tenancy/tenancy.module';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';

describe('Phase 10 — Analytics & Evaluation Dashboard Suite', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        InboxModule,
        QaModule,
        AiModule,
        AuditModule,
        AuthModule,
        TenancyModule,
      ],
      providers: [AnalyticsService, StructuredLoggerService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('Operational KPIs & Real Event Calculation', () => {
    it('calculates operational KPIs with real sample sizes (n=...)', async () => {
      const dashboard = await service.getDashboard('tenant-default', 30);

      expect(dashboard).toBeDefined();
      expect(dashboard.tenantId).toBe('tenant-default');
      expect(dashboard.windowDays).toBe(30);

      const op = dashboard.operational;
      expect(op.resolutionRate).toBeGreaterThanOrEqual(0);
      expect(op.resolutionRate).toBeLessThanOrEqual(100);
      expect(op.firstContactResolutionRate).toBeGreaterThanOrEqual(0);
      expect(op.escalationRate).toBeGreaterThanOrEqual(0);
      expect(op.medianFirstResponseSeconds).toBeGreaterThanOrEqual(0);
      expect(op.medianResolutionMinutes).toBeGreaterThanOrEqual(0);
      expect(op.sampleSize).toBeDefined();
      expect(typeof op.sampleSize).toBe('number');
    });

    it('handles empty state gracefully with zeros, avoiding NaN or undefined', async () => {
      const dashboard = await service.getDashboard('tenant-empty-test', 7);

      expect(dashboard.operational.resolutionRate).toBe(0);
      expect(dashboard.operational.firstContactResolutionRate).toBe(0);
      expect(dashboard.operational.escalationRate).toBe(0);
      expect(dashboard.operational.medianFirstResponseSeconds).toBe(0);
      expect(dashboard.operational.medianResolutionMinutes).toBe(0);
      expect(dashboard.operational.totalTickets).toBe(0);
      expect(dashboard.operational.sampleSize).toBe(0);

      // Verify no NaN values
      expect(Number.isNaN(dashboard.operational.resolutionRate)).toBe(false);
      expect(Number.isNaN(dashboard.operational.firstContactResolutionRate)).toBe(false);
    });
  });

  describe('AI Performance KPIs & Reliability', () => {
    it('computes groundedness, citation accuracy, tool success, and QA average', async () => {
      const dashboard = await service.getDashboard('tenant-default', 30);
      const ai = dashboard.aiPerformance;

      expect(ai.citationAccuracy).toBeGreaterThan(90);
      expect(ai.hallucinationRate).toBeLessThan(5);
      expect(ai.toolSuccessRate).toBeGreaterThan(95);
      expect(ai.averageQaScore).toBeGreaterThanOrEqual(1.0);
      expect(ai.averageQaScore).toBeLessThanOrEqual(5.0);
      expect(ai.sampleSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cost Intelligence & Spend Tracking', () => {
    it('tracks spend today, month projection, average/p95 cost per ticket, and budget consumption', async () => {
      const dashboard = await service.getDashboard('tenant-default', 30);
      const cost = dashboard.cost;

      expect(cost.totalSpendTodayUsd).toBeGreaterThanOrEqual(0);
      expect(cost.totalSpendMonthUsd).toBeGreaterThanOrEqual(0);
      expect(cost.projectedMonthSpendUsd).toBeGreaterThanOrEqual(cost.totalSpendMonthUsd);
      expect(cost.averageCostPerTicketUsd).toBeGreaterThanOrEqual(0);
      expect(cost.p95CostPerTicketUsd).toBeGreaterThanOrEqual(cost.averageCostPerTicketUsd);
      expect(cost.budgetConsumedPercent).toBeGreaterThanOrEqual(0);
      expect(cost.budgetConsumedPercent).toBeLessThanOrEqual(100);
      expect(cost.spendByProvider['Google Gemini']).toBeDefined();
    });
  });

  describe('Model Comparison & Golden Eval Matrix', () => {
    it('provides side-by-side benchmark comparison between Gemini, OpenAI, and Local Mock', () => {
      const report = service.getModelComparison();

      expect(report.models.length).toBe(3);
      expect(report.totalGoldenCases).toBe(20);

      const gemini = report.models.find((m) => m.modelName === 'gemini-2.5-flash');
      expect(gemini).toBeDefined();
      expect(gemini?.accuracy).toBeGreaterThan(95);
      expect(gemini?.banglaMrr).toBeGreaterThan(0.9);
      expect(gemini?.regressionDetected).toBe(false);

      const openai = report.models.find((m) => m.modelName === 'gpt-4o-mini');
      expect(openai).toBeDefined();
      expect(openai?.accuracy).toBeGreaterThan(95);

      const mock = report.models.find((m) => m.modelName === 'mock-deterministic');
      expect(mock).toBeDefined();
      expect(mock?.avgLatencyMs).toBeLessThan(50);
    });
  });

  describe('Export Formats & Tenant Isolation', () => {
    it('exports metrics in valid CSV format with headers and rows', async () => {
      const csv = await service.exportAnalytics('tenant-default', 'csv', 30);

      expect(csv).toContain('"Metric Category","Metric Name","Value","Sample Size / Unit"');
      expect(csv).toContain('Resolution Rate');
      expect(csv).toContain('Citation Accuracy');
      expect(csv).toContain('Total Spend Month');
    });

    it('exports metrics in valid JSON format', async () => {
      const json = await service.exportAnalytics('tenant-default', 'json', 30);
      const parsed = JSON.parse(json);

      expect(parsed.tenantId).toBe('tenant-default');
      expect(parsed.operational).toBeDefined();
      expect(parsed.cost).toBeDefined();
    });
  });
});
