import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AgentProfile,
  RoutingSignals,
  AgentCandidateScore,
  RoutingRecommendation,
  SlaRisk,
  ManualOverrideDto,
} from './routing.interface';
import { AuditService } from '../audit/audit.service';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Injectable()
export class RoutingService {
  private agentPool: Map<string, AgentProfile> = new Map();
  private recommendations: Map<string, RoutingRecommendation> = new Map();
  private confidenceThreshold = 0.6; // Configurable threshold for active routing

  constructor(
    private readonly auditService: AuditService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.seedDefaultAgents();
  }

  /**
   * Evaluates routing for incoming signals under SHADOW or ACTIVE mode.
   */
  async evaluateRouting(
    signals: RoutingSignals,
    tenantId: string,
    mode: 'SHADOW' | 'ACTIVE' = 'SHADOW',
  ): Promise<RoutingRecommendation> {
    this.logger.log(
      `Evaluating intelligent routing for conversation ${signals.conversationId} in ${mode} mode`,
      'RoutingService',
      { tenantId, metadata: { intent: signals.intent, urgency: signals.urgency } },
    );

    // 1. Filter eligible agents for this tenant
    const tenantAgents = Array.from(this.agentPool.values()).filter(
      (a) => a.tenantId === tenantId && a.available,
    );

    // 2. Score each candidate
    const scoredCandidates = this.scoreCandidates(signals, tenantAgents);

    // 3. Predict resolution time & SLA risk
    const { predictedMinutes, slaRisk } = this.predictResolutionTimeAndRisk(
      signals.intent,
      signals.urgency,
      signals.slaBufferMinutes,
    );

    // 4. Select top eligible candidate
    const eligibleCandidates = scoredCandidates.filter((c) => c.eligible);
    const topCandidate = eligibleCandidates.length > 0 ? eligibleCandidates[0] : null;

    let selectedAgentId: string | null = null;
    let selectedAgentName: string | null = null;
    let confidence = 0;
    let fallbackApplied = false;
    let fallbackReason: string | undefined;

    if (topCandidate && topCandidate.totalScore >= this.confidenceThreshold) {
      selectedAgentId = topCandidate.agentId;
      selectedAgentName = topCandidate.agentName;
      confidence = topCandidate.totalScore;
    } else if (topCandidate) {
      confidence = topCandidate.totalScore;
      fallbackApplied = true;
      fallbackReason = `Top candidate confidence (${(topCandidate.totalScore * 100).toFixed(
        1,
      )}%) is below active threshold (${(this.confidenceThreshold * 100).toFixed(0)}%)`;
      // In fallback, assign to round-robin or queue
      selectedAgentId = topCandidate.agentId;
      selectedAgentName = topCandidate.agentName;
    } else {
      fallbackApplied = true;
      fallbackReason = 'No eligible agents available within capacity limits';
    }

    // 5. Build structured rationale
    const rationale = this.buildRationale(topCandidate, signals, fallbackApplied, fallbackReason);

    // 6. Construct recommendation
    const recommendation: RoutingRecommendation = {
      conversationId: signals.conversationId,
      tenantId,
      selectedAgentId,
      selectedAgentName,
      confidence: parseFloat(confidence.toFixed(3)),
      rationale,
      alternatives: scoredCandidates.slice(0, 4),
      predictedResolutionMinutes: predictedMinutes,
      slaRisk,
      mode,
      fallbackApplied,
      fallbackReason,
      createdAt: new Date().toISOString(),
    };

    this.recommendations.set(signals.conversationId, recommendation);

    // 7. If ACTIVE mode and successfully assigned without unresolvable fallback, increment workload
    if (mode === 'ACTIVE' && selectedAgentId && !fallbackApplied) {
      const agent = this.agentPool.get(selectedAgentId);
      if (agent) {
        agent.currentWorkload += 1;
      }

      await this.auditService.recordEvent({
        tenantId,
        userId: 'system-ai-routing',
        eventType: 'INTELLIGENT_ROUTING_ASSIGNED',
        resourceType: 'conversation',
        resourceId: signals.conversationId,
        action: 'ASSIGN',
        details: {
          assignedAgentId: selectedAgentId,
          confidence,
          mode,
          intent: signals.intent,
        },
      });
    } else {
      await this.auditService.recordEvent({
        tenantId,
        userId: 'system-ai-routing',
        eventType: 'INTELLIGENT_ROUTING_RECOMMENDED',
        resourceType: 'conversation',
        resourceId: signals.conversationId,
        action: 'RECOMMEND',
        details: {
          recommendedAgentId: selectedAgentId,
          confidence,
          mode,
          fallbackApplied,
        },
      });
    }

    return recommendation;
  }

  /**
   * Applies manager manual override, recording rationale and adjusting workloads.
   */
  async applyManualOverride(
    dto: ManualOverrideDto,
    tenantId: string,
    managerId: string,
  ): Promise<{ success: boolean; newAgentId: string; previousAgentId: string | null }> {
    const targetAgent = this.agentPool.get(dto.targetAgentId);
    if (!targetAgent || targetAgent.tenantId !== tenantId) {
      throw new NotFoundException(`Agent '${dto.targetAgentId}' not found for tenant '${tenantId}'`);
    }

    const recommendation = this.recommendations.get(dto.conversationId);
    const previousAgentId = recommendation ? recommendation.selectedAgentId : null;

    // Adjust workloads
    if (previousAgentId) {
      const prevAgent = this.agentPool.get(previousAgentId);
      if (prevAgent && prevAgent.currentWorkload > 0) {
        prevAgent.currentWorkload -= 1;
      }
    }

    targetAgent.currentWorkload += 1;

    // Update recommendation record
    if (recommendation) {
      recommendation.selectedAgentId = targetAgent.id;
      recommendation.selectedAgentName = targetAgent.name;
    }

    await this.auditService.recordEvent({
      tenantId,
      userId: managerId,
      eventType: 'ROUTING_MANUAL_OVERRIDE',
      resourceType: 'conversation',
      resourceId: dto.conversationId,
      action: 'OVERRIDE',
      details: {
        targetAgentId: targetAgent.id,
        previousAgentId,
        reason: dto.reason,
      },
    });

    this.logger.log(
      `Manager ${managerId} overrode routing for ${dto.conversationId} -> ${targetAgent.name}`,
      'RoutingService',
      { tenantId, userId: managerId, metadata: { reason: dto.reason } },
    );

    return {
      success: true,
      newAgentId: targetAgent.id,
      previousAgentId,
    };
  }

  listAgents(tenantId: string): AgentProfile[] {
    return Array.from(this.agentPool.values()).filter((a) => a.tenantId === tenantId);
  }

  getAgent(agentId: string, tenantId: string): AgentProfile {
    const agent = this.agentPool.get(agentId);
    if (!agent || agent.tenantId !== tenantId) {
      throw new NotFoundException(`Agent '${agentId}' not found`);
    }
    return agent;
  }

  setAgentWorkload(agentId: string, workload: number): void {
    const agent = this.agentPool.get(agentId);
    if (agent) {
      agent.currentWorkload = workload;
    }
  }

  /**
   * Multi-signal scoring calculation.
   */
  scoreCandidates(signals: RoutingSignals, agents: AgentProfile[]): AgentCandidateScore[] {
    return agents
      .map((agent) => {
        // Hard constraint: Capacity limit
        if (agent.currentWorkload >= agent.maxCapacity) {
          return {
            agentId: agent.id,
            agentName: agent.name,
            totalScore: 0,
            eligible: false,
            exclusionReason: `At maximum capacity (${agent.currentWorkload}/${agent.maxCapacity} active tickets)`,
            breakdown: {
              skillMatch: 0,
              capacityScore: 0,
              languageMatch: 0,
              urgencyBonus: 0,
              csatFactor: 0,
            },
          };
        }

        // 1. Skill Match (35%)
        const requiredSkill = this.mapIntentToSkill(signals.intent);
        const hasPrimarySkill = agent.skills.includes(requiredSkill);
        const hasVipSkill = signals.customerTier === 'VIP' ? agent.skills.includes('vip') : true;
        let skillMatch = hasPrimarySkill ? 1.0 : 0.4;
        if (signals.customerTier === 'VIP' && !hasVipSkill) {
          skillMatch *= 0.5; // Penalty for VIP ticket with non-VIP agent
        }

        // 2. Capacity Score (25%)
        const availableSlots = agent.maxCapacity - agent.currentWorkload;
        const capacityScore = availableSlots / agent.maxCapacity;

        // 3. Language Match (20%)
        const langMatch = agent.languages.includes(signals.language)
          ? 1.0
          : agent.languages.includes('en')
          ? 0.5
          : 0.2;

        // 4. CSAT Factor (10%)
        const csatFactor = Math.min(agent.historicalCsat / 5.0, 1.0);

        // 5. Urgency Bonus (10%)
        let urgencyBonus = 0.5;
        if (signals.urgency === 'critical' || signals.urgency === 'high') {
          // Urgent tickets favor agents with higher CSAT and high capacity
          urgencyBonus = csatFactor * 0.7 + capacityScore * 0.3;
        }

        // Composite Weighted Score
        const totalScore =
          skillMatch * 0.35 +
          capacityScore * 0.25 +
          langMatch * 0.2 +
          csatFactor * 0.1 +
          urgencyBonus * 0.1;

        return {
          agentId: agent.id,
          agentName: agent.name,
          totalScore: parseFloat(totalScore.toFixed(3)),
          eligible: true,
          breakdown: {
            skillMatch: parseFloat(skillMatch.toFixed(2)),
            capacityScore: parseFloat(capacityScore.toFixed(2)),
            languageMatch: parseFloat(langMatch.toFixed(2)),
            urgencyBonus: parseFloat(urgencyBonus.toFixed(2)),
            csatFactor: parseFloat(csatFactor.toFixed(2)),
          },
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Estimates resolution time and flags SLA risk.
   */
  private predictResolutionTimeAndRisk(
    intent: string,
    urgency: string,
    slaBufferMinutes: number,
  ): { predictedMinutes: number; slaRisk: SlaRisk } {
    let baseMinutes = 20;

    switch (intent) {
      case 'refund_request':
        baseMinutes = 45;
        break;
      case 'courier_delay':
        baseMinutes = 35;
        break;
      case 'order_tracking':
        baseMinutes = 10;
        break;
      case 'cancellation':
        baseMinutes = 15;
        break;
      case 'technical_support':
        baseMinutes = 60;
        break;
      default:
        baseMinutes = 25;
    }

    if (urgency === 'critical') baseMinutes = Math.round(baseMinutes * 0.7); // Prioritized handling
    if (urgency === 'low') baseMinutes = Math.round(baseMinutes * 1.3);

    let slaRisk: SlaRisk = 'NONE';
    if (slaBufferMinutes <= 15) {
      slaRisk = 'CRITICAL';
    } else if (slaBufferMinutes <= 30 || baseMinutes > slaBufferMinutes) {
      slaRisk = 'HIGH';
    } else if (slaBufferMinutes <= 60) {
      slaRisk = 'LOW';
    }

    return { predictedMinutes: baseMinutes, slaRisk };
  }

  private mapIntentToSkill(intent: string): string {
    switch (intent) {
      case 'refund_request':
      case 'cancellation':
        return 'refunds';
      case 'order_tracking':
      case 'courier_delay':
        return 'logistics';
      case 'technical_support':
        return 'technical';
      default:
        return 'general';
    }
  }

  private buildRationale(
    topCandidate: AgentCandidateScore | null,
    signals: RoutingSignals,
    fallbackApplied: boolean,
    fallbackReason?: string,
  ): string {
    if (fallbackApplied || !topCandidate) {
      return `Routing fallback triggered: ${fallbackReason || 'No eligible candidate found'}.`;
    }

    const { breakdown } = topCandidate;
    const parts = [
      `Selected ${topCandidate.agentName} (match confidence: ${(topCandidate.totalScore * 100).toFixed(
        1,
      )}%).`,
      `Skill alignment on '${signals.intent}': ${(breakdown.skillMatch * 100).toFixed(0)}%.`,
      `Language proficiency on '${signals.language}': ${(breakdown.languageMatch * 100).toFixed(0)}%.`,
      `Current capacity availability: ${(breakdown.capacityScore * 100).toFixed(0)}%.`,
    ];

    if (signals.customerTier === 'VIP') {
      parts.push('VIP tier prioritization applied.');
    }

    return parts.join(' ');
  }

  private seedDefaultAgents(): void {
    const defaultAgents: AgentProfile[] = [
      {
        id: 'agent-tanvir',
        tenantId: 'tenant-default',
        name: 'Tanvir Ahmed',
        email: 'tanvir@servora.local',
        role: 'SUPPORT_AGENT',
        skills: ['logistics', 'general'],
        languages: ['en', 'bn', 'bn-Latn'],
        currentWorkload: 1,
        maxCapacity: 5,
        historicalCsat: 4.8,
        available: true,
      },
      {
        id: 'agent-farhana',
        tenantId: 'tenant-default',
        name: 'Farhana Yasmin',
        email: 'farhana@servora.local',
        role: 'SUPPORT_AGENT',
        skills: ['refunds', 'vip', 'general'],
        languages: ['en', 'bn'],
        currentWorkload: 2,
        maxCapacity: 5,
        historicalCsat: 4.9,
        available: true,
      },
      {
        id: 'agent-arif',
        tenantId: 'tenant-default',
        name: 'Arif Chowdhury',
        email: 'arif@servora.local',
        role: 'SUPPORT_AGENT',
        skills: ['technical', 'general'],
        languages: ['en', 'bn-Latn'],
        currentWorkload: 0,
        maxCapacity: 4,
        historicalCsat: 4.6,
        available: true,
      },
      {
        id: 'agent-isolated-1',
        tenantId: 'tenant-isolated',
        name: 'Isolated Agent',
        email: 'iso@acme.local',
        role: 'SUPPORT_AGENT',
        skills: ['general', 'refunds'],
        languages: ['en'],
        currentWorkload: 0,
        maxCapacity: 5,
        historicalCsat: 5.0,
        available: true,
      },
    ];

    for (const a of defaultAgents) {
      this.agentPool.set(a.id, a);
    }
  }
}
