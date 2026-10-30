import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider, LlmResponse, CompletionOptions } from './llm-provider.interface';

@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly providerName = 'gemini';

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string | undefined {
    return this.configService.get<string>('llm.geminiApiKey');
  }

  private getModel(): string {
    return this.configService.get<string>('llm.geminiModel') || 'gemini-2.5-flash';
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LlmResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('[GeminiProvider] Missing SERVORA_GEMINI_API_KEY');
    }

    const startTime = Date.now();
    const model = this.getModel();

    // Call upstream Gemini API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.2,
          maxOutputTokens: options?.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Gemini API Error] HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const promptTokens = data.usageMetadata?.promptTokenCount || Math.floor(prompt.length / 4);
    const completionTokens = data.usageMetadata?.candidatesTokenCount || Math.floor(candidateText.length / 4);
    const totalTokens = promptTokens + completionTokens;

    return {
      text: candidateText,
      tokenUsage: { promptTokens, completionTokens, totalTokens },
      costUsd: parseFloat((totalTokens * 0.0000005).toFixed(6)),
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
    const prompt = `You are a helpful customer support agent for Servora Intelligence. Draft a professional, empathetic response to the customer in language "${customerLanguage}".
Only use the verified facts provided below. Do not promise financial refunds without human manager approval.

Verified Knowledge Base Context:
${knowledgeContext || 'None'}

Conversation:
${conversationContext}`;

    return this.generateCompletion(prompt, { temperature: 0.2 });
  }
}

