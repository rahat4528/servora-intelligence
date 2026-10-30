export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmResponse {
  text: string;
  tokenUsage: TokenUsage;
  costUsd: number;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface LlmProvider {
  readonly providerName: string;
  generateCompletion(prompt: string, options?: CompletionOptions): Promise<LlmResponse>;
  generateSummary(conversationContext: string): Promise<LlmResponse>;
  generateSuggestedReply(
    conversationContext: string,
    knowledgeContext?: string,
    customerLanguage?: string,
  ): Promise<LlmResponse>;
}

