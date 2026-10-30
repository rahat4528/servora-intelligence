import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RoutingService } from '../src/routing/routing.service';
import { AuditModule } from '../src/audit/audit.module';
import { AuthModule } from '../src/auth/auth.module';
import { TenancyModule } from '../src/common/tenancy/tenancy.module';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';
import { RoutingSignals } from '../src/routing/routing.interface';

describe('Phase 8 — Intelligent Routing Suite', () => {
  let service: RoutingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuditModule, AuthModule, TenancyModule],
      providers: [RoutingService, StructuredLoggerService],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
  });

  describe('Multi-Signal Scoring & Explainability', () => {
    it('selects logistics specialist with Bangla language proficiency for delayed courier ticket', async () => {
      const signals: RoutingSignals = {
        conversationId: 'conv-route-1',
        tenantId: 'tenant-default',
        intent: 'courier_delay',
        sentiment: 'negative',
        urgency: 'high',
        language: 'bn-Latn',
        customerTier: 'STANDARD',
        slaBufferMinutes: 120,
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');

      expect(result).toBeDefined();
      expect(result.selectedAgentId).toBe('agent-tanvir'); // Tanvir has logistics + bn-Latn
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.rationale).toContain('Tanvir Ahmed');
      expect(result.rationale).toContain('courier_delay');
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.mode).toBe('SHADOW');
    });

    it('prioritizes VIP-certified agent for high-value VIP customer refund', async () => {
      const signals: RoutingSignals = {
        conversationId: 'conv-route-2',
        tenantId: 'tenant-default',
        intent: 'refund_request',
        sentiment: 'negative',
        urgency: 'high',
        language: 'en',
        customerTier: 'VIP',
        slaBufferMinutes: 90,
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');

      expect(result.selectedAgentId).toBe('agent-farhana'); // Farhana has refunds + vip skills
      expect(result.rationale).toContain('VIP tier prioritization applied');
    });
  });

  describe('Workload Capping & Capacity Limits', () => {
    it('excludes agents at maximum capacity and routes to next best candidate', async () => {
      // Set Tanvir to max capacity (5/5)
      service.setAgentWorkload('agent-tanvir', 5);

      const signals: RoutingSignals = {
        conversationId: 'conv-route-cap',
        tenantId: 'tenant-default',
        intent: 'courier_delay',
        sentiment: 'neutral',
        urgency: 'medium',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 120,
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');

      // Tanvir must NOT be selected because he is at max capacity
      expect(result.selectedAgentId).not.toBe('agent-tanvir');
      const tanvirCandidate = result.alternatives.find((c) => c.agentId === 'agent-tanvir');
      expect(tanvirCandidate?.eligible).toBe(false);
      expect(tanvirCandidate?.exclusionReason).toContain('maximum capacity');
    });
  });

  describe('Shadow vs Active Mode Routing', () => {
    it('in SHADOW mode, computes recommendation without incrementing agent workload', async () => {
      const agentBefore = service.getAgent('agent-farhana', 'tenant-default');
      const workloadBefore = agentBefore.currentWorkload;

      const signals: RoutingSignals = {
        conversationId: 'conv-shadow-1',
        tenantId: 'tenant-default',
        intent: 'refund_request',
        sentiment: 'neutral',
        urgency: 'low',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 180,
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');
      expect(result.mode).toBe('SHADOW');

      const agentAfter = service.getAgent('agent-farhana', 'tenant-default');
      expect(agentAfter.currentWorkload).toBe(workloadBefore); // Workload unchanged
    });

    it('in ACTIVE mode, auto-assigns ticket and increments agent workload', async () => {
      const agentBefore = service.getAgent('agent-arif', 'tenant-default');
      const workloadBefore = agentBefore.currentWorkload;

      const signals: RoutingSignals = {
        conversationId: 'conv-active-1',
        tenantId: 'tenant-default',
        intent: 'technical_support',
        sentiment: 'neutral',
        urgency: 'medium',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 180,
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'ACTIVE');
      expect(result.mode).toBe('ACTIVE');
      expect(result.selectedAgentId).toBe('agent-arif'); // Arif has technical skill

      const agentAfter = service.getAgent('agent-arif', 'tenant-default');
      expect(agentAfter.currentWorkload).toBe(workloadBefore + 1); // Workload incremented
    });
  });

  describe('Resolution Time Prediction & SLA Risk Flagging', () => {
    it('estimates resolution time and flags CRITICAL SLA risk for short SLA buffer', async () => {
      const signals: RoutingSignals = {
        conversationId: 'conv-sla-critical',
        tenantId: 'tenant-default',
        intent: 'refund_request', // base ~45 mins
        sentiment: 'negative',
        urgency: 'critical',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 10, // Only 10 mins left!
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');

      expect(result.predictedResolutionMinutes).toBeGreaterThan(0);
      expect(result.slaRisk).toBe('CRITICAL');
    });

    it('flags HIGH SLA risk when predicted resolution exceeds SLA buffer', async () => {
      const signals: RoutingSignals = {
        conversationId: 'conv-sla-high',
        tenantId: 'tenant-default',
        intent: 'technical_support', // ~60 mins
        sentiment: 'neutral',
        urgency: 'medium',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 40, // 40 < 60 mins predicted
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');
      expect(result.slaRisk).toBe('HIGH');
    });
  });

  describe('Manager Manual Override & Multi-Tenant Isolation', () => {
    it('applies manager manual override and reallocates workloads', async () => {
      // 1. Evaluate in active mode
      const signals: RoutingSignals = {
        conversationId: 'conv-override-1',
        tenantId: 'tenant-default',
        intent: 'technical_support',
        sentiment: 'neutral',
        urgency: 'medium',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 120,
      };

      const routing = await service.evaluateRouting(signals, 'tenant-default', 'ACTIVE');
      expect(routing.selectedAgentId).toBe('agent-arif');

      const arifWorkloadBefore = service.getAgent('agent-arif', 'tenant-default').currentWorkload;
      const tanvirWorkloadBefore = service.getAgent('agent-tanvir', 'tenant-default').currentWorkload;

      // 2. Manager overrides assignment to Tanvir
      const override = await service.applyManualOverride(
        {
          conversationId: 'conv-override-1',
          targetAgentId: 'agent-tanvir',
          reason: 'Customer requested Tanvir specifically from previous ticket',
        },
        'tenant-default',
        'manager-chief',
      );

      expect(override.success).toBe(true);
      expect(override.newAgentId).toBe('agent-tanvir');
      expect(override.previousAgentId).toBe('agent-arif');

      // 3. Workload checks
      expect(service.getAgent('agent-arif', 'tenant-default').currentWorkload).toBe(
        arifWorkloadBefore - 1,
      );
      expect(service.getAgent('agent-tanvir', 'tenant-default').currentWorkload).toBe(
        tanvirWorkloadBefore + 1,
      );
    });

    it('strictly isolates routing between tenants', async () => {
      const signals: RoutingSignals = {
        conversationId: 'conv-tenant-a',
        tenantId: 'tenant-default',
        intent: 'refund_request',
        sentiment: 'neutral',
        urgency: 'low',
        language: 'en',
        customerTier: 'STANDARD',
        slaBufferMinutes: 120,
      };

      const result = await service.evaluateRouting(signals, 'tenant-default', 'SHADOW');

      // Must never consider agent-isolated-1
      const isolatedCandidate = result.alternatives.find((c) => c.agentId === 'agent-isolated-1');
      expect(isolatedCandidate).toBeUndefined();

      // Tenant isolated agent list should only have isolated agents
      const isolatedAgents = service.listAgents('tenant-isolated');
      expect(isolatedAgents.every((a) => a.tenantId === 'tenant-isolated')).toBe(true);
      expect(isolatedAgents.find((a) => a.id === 'agent-tanvir')).toBeUndefined();
    });
  });
});
