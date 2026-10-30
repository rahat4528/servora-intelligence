import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider, LlmResponse, CompletionOptions } from './llm-provider.interface';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly providerName = 'openai';

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string | undefined {
    return this.configService.get<string>('llm.openaiApiKey');
  }

  private getModel(): string {
    return this.configService.get<string>('llm.openaiModel') || 'gpt-4o-mini';
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LlmResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('[OpenAiProvider] Missing SERVORA_OPENAI_API_KEY');
    }

    const startTime = Date.now();
    const model = this.getModel();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[OpenAI API Error] HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const candidateText = data.choices?.[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || Math.floor(prompt.length / 4);
    const completionTokens = data.usage?.completion_tokens || Math.floor(candidateText.length / 4);
    const totalTokens = promptTokens + completionTokens;

    return {
      text: candidateText,
      tokenUsage: { promptTokens, completionTokens, totalTokens },
      costUsd: parseFloat((totalTokens * 0.0000008).toFixed(6)),
      provider: this.providerName,
      model,
      latencyMs: Date.now() - startTime,
    };
  }

  async generateSummary(conversationContext: string): Promise<LlmResponse> {
    const prompt = `Summarize this customer support conversation clearly in 2-3 sentences. Identify: 1) customer issue, 2) action taken, 3) current status.\n\nConversation:\n${conversationContext}`;
    return this.generateCompletion(prompt, { temperature: 0.1 });
  }

  async generateSuggestedReply(
    conversationContext: string,
    knowledgeContext?: string,
    customerLanguage: string = 'en',
  ): Promise<LlmResponse> {
    const prompt = `You are an AI customer support assistant. Reply politely and accurately in language "${customerLanguage}".
Knowledge: ${knowledgeContext || 'None'}
Conversation: ${conversationContext}`;
    return this.generateCompletion(prompt, { temperature: 0.2 });
  }
}

