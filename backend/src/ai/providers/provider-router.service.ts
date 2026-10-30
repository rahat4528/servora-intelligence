import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../../common/logging/structured-logger.service';
import { LlmProvider, LlmResponse, CompletionOptions } from './llm-provider.interface';
import { MockLlmProvider } from './mock.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenAiProvider } from './openai.provider';

@Injectable()
export class ProviderRouterService implements LlmProvider {
  readonly providerName = 'router';
  private primaryProvider: LlmProvider;
  private fallbackProvider: LlmProvider;
  private mockProvider: MockLlmProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenAiProvider,
    private readonly mockLlmProvider: MockLlmProvider,
  ) {
    this.mockProvider = this.mockLlmProvider;
    this.primaryProvider = this.resolveProvider(
      this.configService.get<string>('llm.primaryProvider') || 'mock',
    );
    this.fallbackProvider = this.resolveProvider(
      this.configService.get<string>('llm.fallbackProvider') || 'mock',
    );
  }

  private resolveProvider(name: string): LlmProvider {
    switch (name.toLowerCase()) {
      case 'gemini':
        return this.geminiProvider;
      case 'openai':
        return this.openaiProvider;
      case 'mock':
      default:
        return this.mockProvider;
    }
  }

  private async executeWithFallback(
    operationName: string,
    execute: (provider: LlmProvider) => Promise<LlmResponse>,
  ): Promise<LlmResponse> {
    try {
      return await execute(this.primaryProvider);
    } catch (primaryErr: any) {
      this.logger.warn(
        `[LLM Failover] Primary provider '${this.primaryProvider.providerName}' failed for ${operationName}: ${primaryErr.message}. Attempting fallback '${this.fallbackProvider.providerName}'`,
        'ProviderRouterService',
      );

      try {
        return await execute(this.fallbackProvider);
      } catch (fallbackErr: any) {
        this.logger.warn(
          `[LLM Failover] Fallback provider '${this.fallbackProvider.providerName}' failed for ${operationName}: ${fallbackErr.message}. Degrading safely to deterministic mock provider.`,
          'ProviderRouterService',
        );
        return await execute(this.mockProvider);
      }
    }
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LlmResponse> {
    return this.executeWithFallback('generateCompletion', (p) => p.generateCompletion(prompt, options));
  }

  async generateSummary(conversationContext: string): Promise<LlmResponse> {
    return this.executeWithFallback('generateSummary', (p) => p.generateSummary(conversationContext));
  }

  async generateSuggestedReply(
    conversationContext: string,
    knowledgeContext?: string,
    customerLanguage: string = 'en',
  ): Promise<LlmResponse> {
    return this.executeWithFallback('generateSuggestedReply', (p) =>
      p.generateSuggestedReply(conversationContext, knowledgeContext, customerLanguage),
    );
  }
}

