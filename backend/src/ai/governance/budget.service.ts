import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../../common/logging/structured-logger.service';

export interface TenantUsageRecord {
  tenantId: string;
  dailySpendUsd: number;
  monthlySpendUsd: number;
  totalTokensUsed: number;
  totalRequests: number;
  lastResetDate: string;
}

export interface ConversationUsageRecord {
  conversationId: string;
  tenantId: string;
  tokensUsed: number;
  toolCallsCount: number;
  costUsd: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  dailyRemainingUsd: number;
  monthlyRemainingUsd: number;
}

@Injectable()
export class BudgetService {
  private tenantUsage: Map<string, TenantUsageRecord> = new Map();
  private conversationUsage: Map<string, ConversationUsageRecord> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
  ) {}

  private getTenantRecord(tenantId: string): TenantUsageRecord {
    const today = new Date().toISOString().split('T')[0];
    let record = this.tenantUsage.get(tenantId);

    if (!record) {
      record = {
        tenantId,
        dailySpendUsd: 0,
        monthlySpendUsd: 0,
        totalTokensUsed: 0,
        totalRequests: 0,
        lastResetDate: today,
      };
      this.tenantUsage.set(tenantId, record);
    } else if (record.lastResetDate !== today) {
      // Daily reset
      record.dailySpendUsd = 0;
      record.lastResetDate = today;
    }

    return record;
  }

  checkBudget(tenantId: string, conversationId?: string): BudgetCheckResult {
    const record = this.getTenantRecord(tenantId);
    const maxDaily = this.configService.get<number>('governance.maxDailyBudgetUsd') || 50.0;
    const maxMonthly = this.configService.get<number>('governance.maxMonthlyBudgetUsd') || 1000.0;
    const maxTokensPerConv = this.configService.get<number>('governance.maxTokensPerConversation') || 8000;
    const maxToolCallsPerConv = this.configService.get<number>('governance.maxToolCallsPerConversation') || 5;

    const dailyRemaining = Math.max(0, maxDaily - record.dailySpendUsd);
    const monthlyRemaining = Math.max(0, maxMonthly - record.monthlySpendUsd);

    if (record.dailySpendUsd >= maxDaily) {
      this.logger.warn(`Tenant ${tenantId} exceeded daily AI budget limit ($${maxDaily})`, 'BudgetService');
      return {
        allowed: false,
        reason: `Tenant exceeded daily AI budget limit ($${maxDaily}). AI assistance temporarily paused.`,
        dailyRemainingUsd: 0,
        monthlyRemainingUsd: monthlyRemaining,
      };
    }

    if (record.monthlySpendUsd >= maxMonthly) {
      this.logger.warn(`Tenant ${tenantId} exceeded monthly AI budget limit ($${maxMonthly})`, 'BudgetService');
      return {
        allowed: false,
        reason: `Tenant exceeded monthly AI budget limit ($${maxMonthly}). AI assistance paused until next billing cycle.`,
        dailyRemainingUsd: dailyRemaining,
        monthlyRemainingUsd: 0,
      };
    }

    if (conversationId) {
      const convUsage = this.conversationUsage.get(conversationId);
      if (convUsage) {
        if (convUsage.tokensUsed >= maxTokensPerConv) {
          return {
            allowed: false,
            reason: `Conversation reached token safety budget ceiling (${maxTokensPerConv} tokens).`,
            dailyRemainingUsd: dailyRemaining,
            monthlyRemainingUsd: monthlyRemaining,
          };
        }
        if (convUsage.toolCallsCount >= maxToolCallsPerConv) {
          return {
            allowed: false,
            reason: `Conversation reached maximum allowed tool operations (${maxToolCallsPerConv}).`,
            dailyRemainingUsd: dailyRemaining,
            monthlyRemainingUsd: monthlyRemaining,
          };
        }
      }
    }

    return {
      allowed: true,
      dailyRemainingUsd: dailyRemaining,
      monthlyRemainingUsd: monthlyRemaining,
    };
  }

  recordUsage(
    tenantId: string,
    conversationId: string | undefined,
    tokens: number,
    costUsd: number,
    toolCalls: number = 0,
  ): void {
    const record = this.getTenantRecord(tenantId);
    record.dailySpendUsd += costUsd;
    record.monthlySpendUsd += costUsd;
    record.totalTokensUsed += tokens;
    record.totalRequests += 1;
    this.tenantUsage.set(tenantId, record);

    if (conversationId) {
      let convUsage = this.conversationUsage.get(conversationId);
      if (!convUsage) {
        convUsage = {
          conversationId,
          tenantId,
          tokensUsed: 0,
          toolCallsCount: 0,
          costUsd: 0,
        };
      }
      convUsage.tokensUsed += tokens;
      convUsage.toolCallsCount += toolCalls;
      convUsage.costUsd += costUsd;
      this.conversationUsage.set(conversationId, convUsage);
    }
  }

  getTenantUsage(tenantId: string): TenantUsageRecord {
    return { ...this.getTenantRecord(tenantId) };
  }

  resetTenantSpendForTesting(tenantId: string): void {
    const record = this.getTenantRecord(tenantId);
    record.dailySpendUsd = 0;
    record.monthlySpendUsd = 0;
    this.tenantUsage.set(tenantId, record);
  }
}

