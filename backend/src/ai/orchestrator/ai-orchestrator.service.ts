import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '../../common/feature-flags/feature-flags.service';
import { FeatureFlagKeys } from '@servora/common';
import { BudgetService } from '../governance/budget.service';
import { PiiService } from '../safety/pii.service';
import { PromptInjectionService } from '../safety/prompt-injection.service';
import { LanguageDetectorService } from '../language/language-detector.service';
import { IntentClassifierService } from '../language/intent-classifier.service';
import { ProviderRouterService } from '../providers/provider-router.service';
import { InboxService } from '../../inbox/inbox.service';

export interface AiSummaryResult {
  summary: string;
  language: string;
  intent: string;
  sentiment: string;
  urgency: number;
  piiRedacted: boolean;
  costUsd: number;
  provider: string;
  model: string;
}

export interface AiSuggestedReplyResult {
  suggestedReply: string;
  language: string;
  citations: string[];
  costUsd: number;
  provider: string;
  model: string;
}

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly budgetService: BudgetService,
    private readonly piiService: PiiService,
    private readonly promptInjectionService: PromptInjectionService,
    private readonly languageDetectorService: LanguageDetectorService,
    private readonly intentClassifierService: IntentClassifierService,
    private readonly providerRouterService: ProviderRouterService,
    private readonly inboxService: InboxService,
  ) {}

  async generateConversationSummary(
    conversationId: string,
    tenantId: string,
  ): Promise<AiSummaryResult> {
    // 1. Check Tenant Feature Flag
    if (!this.featureFlagsService.isEnabled(tenantId, FeatureFlagKeys.AI_SUMMARIES)) {
      return {
        summary: 'AI summaries are currently disabled for this tenant.',
        language: 'en',
        intent: 'general_support',
        sentiment: 'neutral',
        urgency: 2,
        piiRedacted: false,
        costUsd: 0,
        provider: 'disabled',
        model: 'none',
      };
    }

    // 2. Check Tenant AI Budget
    const budgetCheck = this.budgetService.checkBudget(tenantId, conversationId);
    if (!budgetCheck.allowed) {
      return {
        summary: `AI assistance paused: ${budgetCheck.reason}`,
        language: 'en',
        intent: 'general_support',
        sentiment: 'neutral',
        urgency: 2,
        piiRedacted: false,
        costUsd: 0,
        provider: 'budget_limit',
        model: 'none',
      };
    }

    // 3. Fetch Conversation Thread
    const conv = this.inboxService.getConversationById(conversationId, tenantId);
    const messages = conv.messages || [];
    const rawContext = messages.map((m) => `${m.senderName} (${m.senderType}): ${m.content}`).join('\n');

    // 4. Redact PII
    const piiResult = this.piiService.redact(rawContext);

    // 5. Detect Language & Classify Intent/Sentiment/Urgency
    const latestCustomerMsg = messages.filter((m) => m.senderType === 'CUSTOMER').pop()?.content || conv.title;
    const langResult = this.languageDetectorService.detectLanguage(latestCustomerMsg);
    const classResult = this.intentClassifierService.classify(latestCustomerMsg);

    // 6. Generate Summary via Provider Router
    const llmResult = await this.providerRouterService.generateSummary(piiResult.redactedText);

    // 7. Record Usage in Budget Service
    this.budgetService.recordUsage(
      tenantId,
      conversationId,
      llmResult.tokenUsage.totalTokens,
      llmResult.costUsd,
    );

    return {
      summary: llmResult.text,
      language: langResult.language,
      intent: classResult.intent,
      sentiment: classResult.sentiment,
      urgency: classResult.urgency,
      piiRedacted: piiResult.hasPii,
      costUsd: llmResult.costUsd,
      provider: llmResult.provider,
      model: llmResult.model,
    };
  }

  async generateSuggestedReply(
    conversationId: string,
    tenantId: string,
    knowledgeContext?: string,
  ): Promise<AiSuggestedReplyResult> {
    // 1. Check Feature Flag
    if (!this.featureFlagsService.isEnabled(tenantId, FeatureFlagKeys.AI_REPLY_SUGGESTIONS)) {
      return {
        suggestedReply: 'AI suggestions are disabled for this tenant.',
        language: 'en',
        citations: [],
        costUsd: 0,
        provider: 'disabled',
        model: 'none',
      };
    }

    // 2. Check Budget
    const budgetCheck = this.budgetService.checkBudget(tenantId, conversationId);
    if (!budgetCheck.allowed) {
      return {
        suggestedReply: `AI assistance paused: ${budgetCheck.reason}`,
        language: 'en',
        citations: [],
        costUsd: 0,
        provider: 'budget_limit',
        model: 'none',
      };
    }

    // 3. Fetch Conversation Thread
    const conv = this.inboxService.getConversationById(conversationId, tenantId);
    const messages = conv.messages || [];
    const latestCustomerMsg = messages.filter((m) => m.senderType === 'CUSTOMER').pop()?.content || conv.title;

    // 4. Redact PII
    const piiResult = this.piiService.redact(latestCustomerMsg);

    // 5. Detect Language
    const langResult = this.languageDetectorService.detectLanguage(latestCustomerMsg);

    // 6. Generate Safe Grounded Reply
    const llmResult = await this.providerRouterService.generateSuggestedReply(
      piiResult.redactedText,
      knowledgeContext,
      langResult.language,
    );

    // 7. Record Usage
    this.budgetService.recordUsage(
      tenantId,
      conversationId,
      llmResult.tokenUsage.totalTokens,
      llmResult.costUsd,
    );

    // Extract citations if present
    const citations: string[] = [];
    const citationMatch = llmResult.text.match(/Sources:\s*\[(.*?)\]/);
    if (citationMatch) {
      citations.push(citationMatch[1]);
    }

    return {
      suggestedReply: llmResult.text,
      language: langResult.language,
      citations,
      costUsd: llmResult.costUsd,
      provider: llmResult.provider,
      model: llmResult.model,
    };
  }
}

