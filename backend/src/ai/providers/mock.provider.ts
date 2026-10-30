import { Injectable } from '@nestjs/common';
import { LlmProvider, LlmResponse, CompletionOptions } from './llm-provider.interface';

@Injectable()
export class MockLlmProvider implements LlmProvider {
  readonly providerName = 'mock';
  readonly defaultModel = 'servora-mock-llm-v1';

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<LlmResponse> {
    const startTime = Date.now();
    const promptTokens = Math.max(10, Math.floor(prompt.length / 4));
    let text = 'This is a verified deterministic response from Servora Intelligence AI Core.';

    if (prompt.includes('Bangla') || /[\u0980-\u09FF]/.test(prompt)) {
      text = 'ধন্যবাদ আপনার বার্তার জন্য। আমরা আপনার অনুসন্ধানটি খতিয়ে দেখছি এবং শীঘ্রই আপডেট জানাবো।';
    } else if (prompt.includes('kobe') || prompt.includes('amar') || prompt.includes('dorkar')) {
      text = 'Apnar inquiry amra peyechi. Courier shipment er latest status check kore apnake notify kora hocche.';
    }

    const completionTokens = Math.max(15, Math.floor(text.length / 4));
    const totalTokens = promptTokens + completionTokens;

    return {
      text,
      tokenUsage: { promptTokens, completionTokens, totalTokens },
      costUsd: parseFloat(((totalTokens * 0.0000015)).toFixed(6)),
      provider: this.providerName,
      model: this.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }

  async generateSummary(conversationContext: string): Promise<LlmResponse> {
    const startTime = Date.now();
    const promptTokens = Math.max(20, Math.floor(conversationContext.length / 4));

    let summary = 'Customer contacted support regarding an order delivery status inquiry. Agent investigated the courier tracking logs and communicated current customs transit status. Pending final hub dispatch.';

    if (conversationContext.includes('defective') || conversationContext.includes('refund')) {
      summary = 'Customer reported a defective hardware issue (broken spacebar) and requested a replacement or refund. Agent requested photographic evidence to prepare a formal refund draft for manager review.';
    } else if (conversationContext.includes('Amar order') || conversationContext.includes('kobe pabo')) {
      summary = 'Customer submitted an urgent order arrival inquiry in Banglish for Order #CQ-4412. Unassigned conversation requires skill-based courier routing.';
    }

    const completionTokens = Math.max(25, Math.floor(summary.length / 4));
    const totalTokens = promptTokens + completionTokens;

    return {
      text: summary,
      tokenUsage: { promptTokens, completionTokens, totalTokens },
      costUsd: parseFloat(((totalTokens * 0.0000015)).toFixed(6)),
      provider: this.providerName,
      model: this.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }

  async generateSuggestedReply(
    conversationContext: string,
    knowledgeContext?: string,
    customerLanguage: string = 'en',
  ): Promise<LlmResponse> {
    const startTime = Date.now();
    const promptTokens = Math.max(30, Math.floor((conversationContext.length + (knowledgeContext || '').length) / 4));

    let reply = 'Thank you for reaching out! We have checked your shipment with our courier partner. The parcel is currently cleared through the central hub and is scheduled for final door delivery shortly.';

    if (customerLanguage === 'bn' || /[\u0980-\u09FF]/.test(conversationContext)) {
      reply = 'আপনার যোগাযোগের জন্য ধন্যবাদ! আমরা কুরিয়ার ট্র্যাকিং সিস্টেমে চেক করেছি। আপনার অর্ডারটি বর্তমানে কুরিয়ার হাব থেকে ডেলিভারির জন্য প্রস্তুত হচ্ছে।';
    } else if (customerLanguage === 'bn-Latn' || conversationContext.includes('kobe') || conversationContext.includes('amar')) {
      reply = 'Apnar jogajog er jonno dhonnobad! Courier hub theke check kore dekha geche parcel ti transit e ache ebong khub shighroi delivery kora hobe.';
    }

    if (knowledgeContext && knowledgeContext.includes('Refund Policy')) {
      reply += '\n\nSources: [Refund Policy — Section 3]';
    }

    const completionTokens = Math.max(35, Math.floor(reply.length / 4));
    const totalTokens = promptTokens + completionTokens;

    return {
      text: reply,
      tokenUsage: { promptTokens, completionTokens, totalTokens },
      costUsd: parseFloat(((totalTokens * 0.0000015)).toFixed(6)),
      provider: this.providerName,
      model: this.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }
}

