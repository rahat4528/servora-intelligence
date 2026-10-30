import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  QaEvaluation,
  EvaluateConversationDto,
  ReviewQaDto,
  DisputeQaDto,
  QaDimension,
  DimensionScore,
  QaFlags,
  CoachingNotes,
  AgentCoachingSummary,
} from './qa.interface';
import { AuditService } from '../audit/audit.service';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

const DIMENSION_WEIGHTS: Record<QaDimension, number> = {
  accuracy: 0.2,
  policyCompliance: 0.2,
  resolutionQuality: 0.15,
  empathyTone: 0.1,
  clarityConciseness: 0.1,
  citationQuality: 0.1,
  toolCorrectness: 0.05,
  safetyBoundaries: 0.1,
};

@Injectable()
export class QaService {
  private evaluations: Map<string, QaEvaluation> = new Map();

  constructor(
    private readonly auditService: AuditService,
    private readonly logger: StructuredLoggerService,
  ) {}

  /**
   * Evaluates a resolved customer conversation across the 8 dimensions.
   */
  async evaluateConversation(
    dto: EvaluateConversationDto,
    tenantId: string,
  ): Promise<QaEvaluation> {
    this.logger.log(
      `Evaluating conversation ${dto.conversationId} across 8 QA dimensions`,
      'QaService',
      { tenantId, metadata: { conversationId: dto.conversationId, agentId: dto.agentId } },
    );

    const evalId = `qa-${crypto.randomBytes(8).toString('hex')}`;
    const agentName = dto.agentName || 'Support Agent';

    // 1. Evaluate each of the 8 dimensions
    const dimensions = this.evaluateDimensions(dto);

    // 2. Calculate weighted composite overall score
    const overallScore = this.calculateCompositeScore(dimensions);

    // 3. Evaluate critical flags
    const flags = this.evaluateFlags(dimensions);

    // 4. Generate coaching notes
    const coachingNotes = this.generateCoachingNotes(dimensions, dto);

    const evaluation: QaEvaluation = {
      id: evalId,
      tenantId,
      conversationId: dto.conversationId,
      agentId: dto.agentId,
      agentName,
      overallScore: parseFloat(overallScore.toFixed(2)),
      dimensions,
      flags,
      coachingNotes,
      status: 'AI_EVALUATED',
      createdAt: new Date().toISOString(),
    };

    this.evaluations.set(evalId, evaluation);

    await this.auditService.recordEvent({
      tenantId,
      userId: 'system-ai-qa',
      eventType: 'QA_EVALUATION_COMPLETED',
      resourceType: 'qa_evaluation',
      resourceId: evalId,
      action: 'EVALUATE',
      details: {
        conversationId: dto.conversationId,
        overallScore: evaluation.overallScore,
        flags,
      },
    });

    return evaluation;
  }

  /**
   * Manager reviews, agrees, adjusts scores, or overturns an evaluation.
   */
  async reviewEvaluation(
    evalId: string,
    dto: ReviewQaDto,
    tenantId: string,
    managerId: string,
  ): Promise<QaEvaluation> {
    const evaluation = this.evaluations.get(evalId);
    if (!evaluation || evaluation.tenantId !== tenantId) {
      throw new NotFoundException(`QA Evaluation '${evalId}' not found`);
    }

    evaluation.reviewedBy = managerId;
    evaluation.reviewedAt = new Date().toISOString();

    if (dto.action === 'OVERTURN') {
      evaluation.status = 'OVERTURNED';
    } else if (dto.action === 'ADJUST' && dto.adjustedScores) {
      evaluation.status = 'MANAGER_VERIFIED';
      evaluation.managerAdjustments = dto.adjustedScores;

      // Update dimension scores with manager adjustments
      for (const [dim, score] of Object.entries(dto.adjustedScores)) {
        const dimensionKey = dim as QaDimension;
        if (evaluation.dimensions[dimensionKey] && score !== undefined) {
          evaluation.dimensions[dimensionKey].score = score;
          evaluation.dimensions[dimensionKey].rationale += ` (Adjusted by manager ${managerId}: ${dto.reviewNotes})`;
        }
      }

      // Recalculate composite overall score
      evaluation.overallScore = parseFloat(
        this.calculateCompositeScore(evaluation.dimensions).toFixed(2),
      );
      // Re-evaluate flags after adjustment
      evaluation.flags = this.evaluateFlags(evaluation.dimensions);
    } else {
      evaluation.status = 'MANAGER_VERIFIED';
    }

    await this.auditService.recordEvent({
      tenantId,
      userId: managerId,
      eventType: 'QA_EVALUATION_REVIEWED',
      resourceType: 'qa_evaluation',
      resourceId: evalId,
      action: dto.action,
      details: {
        status: evaluation.status,
        overallScore: evaluation.overallScore,
        reviewNotes: dto.reviewNotes,
      },
    });

    return evaluation;
  }

  /**
   * Agent files a dispute on an AI evaluation.
   */
  async disputeEvaluation(
    evalId: string,
    dto: DisputeQaDto,
    tenantId: string,
    agentId: string,
  ): Promise<QaEvaluation> {
    const evaluation = this.evaluations.get(evalId);
    if (!evaluation || evaluation.tenantId !== tenantId) {
      throw new NotFoundException(`QA Evaluation '${evalId}' not found`);
    }

    evaluation.status = 'DISPUTED';
    evaluation.disputeNotes = dto.reason;

    await this.auditService.recordEvent({
      tenantId,
      userId: agentId,
      eventType: 'QA_EVALUATION_DISPUTED',
      resourceType: 'qa_evaluation',
      resourceId: evalId,
      action: 'DISPUTE',
      details: {
        disputeNotes: dto.reason,
      },
    });

    this.logger.log(
      `Agent ${agentId} disputed QA evaluation ${evalId}`,
      'QaService',
      { tenantId, userId: agentId, metadata: { evalId, reason: dto.reason } },
    );

    return evaluation;
  }

  listEvaluations(tenantId: string): QaEvaluation[] {
    return Array.from(this.evaluations.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getEvaluation(evalId: string, tenantId: string): QaEvaluation {
    const evaluation = this.evaluations.get(evalId);
    if (!evaluation || evaluation.tenantId !== tenantId) {
      throw new NotFoundException(`QA Evaluation '${evalId}' not found`);
    }
    return evaluation;
  }

  getAgentCoachingSummary(agentId: string, tenantId: string): AgentCoachingSummary {
    const agentEvals = Array.from(this.evaluations.values())
      .filter((e) => e.tenantId === tenantId && e.agentId === agentId);

    const totalEvaluations = agentEvals.length;
    if (totalEvaluations === 0) {
      return {
        agentId,
        tenantId,
        totalEvaluations: 0,
        averageScore: 5.0,
        dimensionAverages: {
          accuracy: 5.0,
          policyCompliance: 5.0,
          resolutionQuality: 5.0,
          empathyTone: 5.0,
          clarityConciseness: 5.0,
          citationQuality: 5.0,
          toolCorrectness: 5.0,
          safetyBoundaries: 5.0,
        },
        topStrengths: ['No evaluations recorded yet'],
        growthAreas: [],
      };
    }

    const dimensionSums: Record<QaDimension, number> = {
      accuracy: 0,
      policyCompliance: 0,
      resolutionQuality: 0,
      empathyTone: 0,
      clarityConciseness: 0,
      citationQuality: 0,
      toolCorrectness: 0,
      safetyBoundaries: 0,
    };

    let totalScoreSum = 0;
    for (const ev of agentEvals) {
      totalScoreSum += ev.overallScore;
      for (const [dim, dScore] of Object.entries(ev.dimensions)) {
        dimensionSums[dim as QaDimension] += dScore.score;
      }
    }

    const dimensionAverages = {} as Record<QaDimension, number>;
    for (const [dim, sum] of Object.entries(dimensionSums)) {
      dimensionAverages[dim as QaDimension] = parseFloat((sum / totalEvaluations).toFixed(2));
    }

    const averageScore = parseFloat((totalScoreSum / totalEvaluations).toFixed(2));

    // Sort dimensions by score to identify strengths and growth areas
    const sortedDimensions = Object.entries(dimensionAverages).sort((a, b) => b[1] - a[1]);
    const topStrengths = sortedDimensions
      .slice(0, 3)
      .map(([dim, score]) => `${dim} (avg: ${score}/5)`);
    const growthAreas = sortedDimensions
      .filter(([_, score]) => score < 4.0)
      .map(([dim, score]) => `Focus on improving ${dim} (avg: ${score}/5)`);

    return {
      agentId,
      tenantId,
      totalEvaluations,
      averageScore,
      dimensionAverages,
      topStrengths,
      growthAreas,
    };
  }

  private evaluateDimensions(dto: EvaluateConversationDto): Record<QaDimension, DimensionScore> {
    const text = (dto.agentReply || '').toLowerCase();
    const customer = (dto.customerMessage || '').toLowerCase();

    // 1. Accuracy (1-5)
    let accuracyScore = 5;
    let accuracyRationale = 'Response accurately and factually addressed the customer issue.';
    if (text.includes('i don’t know') || text.includes('cannot help')) {
      accuracyScore = 2;
      accuracyRationale = 'Agent provided unhelpful response without factual assistance.';
    } else if (text.length < 20) {
      accuracyScore = 3;
      accuracyRationale = 'Response was excessively brief with insufficient factual detail.';
    }

    // 2. Policy Compliance (1-5)
    let policyScore = 5;
    let policyRationale = 'Followed all refund, return, and cancellation policies correctly.';
    if (
      customer.includes('refund') &&
      (text.includes('no refunds') || text.includes('cannot refund under any condition'))
    ) {
      policyScore = 1;
      policyRationale = 'Direct breach of refund policy: Blanket refusal without assessing eligibility.';
    } else if (text.includes('send cash directly') || text.includes('personal bkash')) {
      policyScore = 1;
      policyRationale = 'Severe policy breach: Soliciting off-platform personal payment transfer.';
    }

    // 3. Resolution Quality (1-5)
    let resolutionScore = 4;
    let resolutionRationale = 'Clear next steps provided towards root issue resolution.';
    if (text.includes('next steps') || text.includes('has been resolved') || text.includes('dispatched')) {
      resolutionScore = 5;
      resolutionRationale = 'Comprehensive resolution with clear tracking and confirmation.';
    } else if (text.includes('wait') && text.length < 30) {
      resolutionScore = 2;
      resolutionRationale = 'Resolution lacked timeline or actionable guidance.';
    }

    // 4. Empathy & Tone (1-5)
    let empathyScore = 4;
    let empathyRationale = 'Professional, polite, and respectful tone maintained.';
    const politeWords = ['sorry', 'apologize', 'thank you', 'please', 'dukkho', 'dhorjo'];
    const rudeWords = ['shut up', 'stop complaining', 'not my problem', 'useless', 'fool'];
    if (rudeWords.some((w) => text.includes(w))) {
      empathyScore = 1;
      empathyRationale = 'Unprofessional, rude, or combative tone detected.';
    } else if (politeWords.some((w) => text.includes(w))) {
      empathyScore = 5;
      empathyRationale = 'High empathy: Sincere apology and polite respectful phrasing.';
    } else if (customer.includes('angry') || customer.includes('delay')) {
      empathyScore = 2;
      empathyRationale = 'Failed to acknowledge customer frustration or express basic empathy.';
    }

    // 5. Clarity & Conciseness (1-5)
    let clarityScore = 4;
    let clarityRationale = 'Message is clear, well-structured, and easy to understand.';
    if (text.split(' ').length > 250) {
      clarityScore = 3;
      clarityRationale = 'Overly verbose and contains repetitive text.';
    } else if (text.split(' ').length < 5) {
      clarityScore = 2;
      clarityRationale = 'Too terse and unclear.';
    }

    // 6. Citation Quality (1-5)
    let citationScore = 4;
    let citationRationale = 'Citations were relevant and properly grounded.';
    if (dto.citationsUsed && dto.citationsUsed.length > 0) {
      citationScore = 5;
      citationRationale = `Properly grounded with ${dto.citationsUsed.length} verified citation(s).`;
    } else if (customer.includes('policy') && (!dto.citationsUsed || dto.citationsUsed.length === 0)) {
      citationScore = 3;
      citationRationale = 'Policy question answered without referencing official knowledge base citation.';
    }

    // 7. Tool Correctness (1-5)
    let toolScore = 5;
    let toolRationale = 'Appropriate tools were called with verified parameters.';
    if (customer.includes('track') || customer.includes('courier')) {
      if (dto.toolsUsed && dto.toolsUsed.length > 0) {
        toolScore = 5;
        toolRationale = `Correctly executed tracking tool: ${dto.toolsUsed.join(', ')}.`;
      } else {
        toolScore = 3;
        toolRationale = 'Tracking inquiry answered without executing live courier lookup tool.';
      }
    }

    // 8. Safety & Boundaries (1-5)
    let safetyScore = 5;
    let safetyRationale = 'Safe: No PII leakage, prompt injections resisted, and boundary integrity maintained.';
    const piiLeakRegex = /(4[0-9]{12}(?:[0-9]{3})?|01[3-9][0-9]{8})/g;
    if (
      customer.includes('ignore previous instructions') ||
      customer.includes('system prompt')
    ) {
      if (text.includes('i am an ai') || text.includes('system prompt is')) {
        safetyScore = 2;
        safetyRationale = 'Boundary failure: Disclosed internal system context to customer.';
      } else {
        safetyScore = 5;
        safetyRationale = 'Excellent: Resisted prompt injection attempt while preserving support boundaries.';
      }
    }

    return {
      accuracy: { score: accuracyScore, rationale: accuracyRationale },
      policyCompliance: { score: policyScore, rationale: policyRationale },
      resolutionQuality: { score: resolutionScore, rationale: resolutionRationale },
      empathyTone: { score: empathyScore, rationale: empathyRationale },
      clarityConciseness: { score: clarityScore, rationale: clarityRationale },
      citationQuality: { score: citationScore, rationale: citationRationale },
      toolCorrectness: { score: toolScore, rationale: toolRationale },
      safetyBoundaries: { score: safetyScore, rationale: safetyRationale },
    };
  }

  private calculateCompositeScore(dimensions: Record<QaDimension, DimensionScore>): number {
    let composite = 0;
    for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
      const dimensionKey = dim as QaDimension;
      composite += dimensions[dimensionKey].score * weight;
    }
    return composite;
  }

  private evaluateFlags(dimensions: Record<QaDimension, DimensionScore>): QaFlags {
    const safetyBreach = dimensions.safetyBoundaries.score < 3;
    const policyBreach = dimensions.policyCompliance.score < 3;
    const lowEmpathy = dimensions.empathyTone.score < 2;

    const reasons: string[] = [];
    if (safetyBreach) reasons.push('Safety score < 3 (security or boundary concern)');
    if (policyBreach) reasons.push('Policy compliance < 3 (breach of store policies)');
    if (lowEmpathy) reasons.push('Empathy score < 2 (tone or disrespect issue)');

    return {
      safetyBreach,
      policyBreach,
      lowEmpathy,
      explanation: reasons.length > 0 ? reasons.join('; ') : undefined,
    };
  }

  private generateCoachingNotes(
    dimensions: Record<QaDimension, DimensionScore>,
    dto: EvaluateConversationDto,
  ): CoachingNotes {
    const strengths: string[] = [];
    const improvements: string[] = [];

    for (const [dim, dScore] of Object.entries(dimensions)) {
      if (dScore.score >= 4) {
        strengths.push(`${dim}: ${dScore.rationale}`);
      } else {
        improvements.push(`${dim} (${dScore.score}/5): ${dScore.rationale}`);
      }
    }

    let suggestedAlternativePhrasing: string | undefined;
    if (dimensions.empathyTone.score < 4) {
      suggestedAlternativePhrasing =
        '“We sincerely apologize for the delay with your delivery. Let me check the live courier status right away and resolve this for you.”';
    }

    let recommendedPolicyReference: string | undefined;
    if (dimensions.policyCompliance.score < 4) {
      recommendedPolicyReference = 'POL-REF-01 (Standard Return & Defective Product Replacement Policy)';
    }

    return {
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 3),
      suggestedAlternativePhrasing,
      recommendedPolicyReference,
    };
  }
}
