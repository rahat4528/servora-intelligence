import { Injectable } from '@nestjs/common';

export type CustomerIntent =
  | 'order_tracking'
  | 'refund_request'
  | 'courier_delay'
  | 'product_inquiry'
  | 'general_support';

export type CustomerSentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';

export interface ClassificationResult {
  intent: CustomerIntent;
  confidence: number;
  sentiment: CustomerSentiment;
  urgency: number; // 1 to 5 scale
  cues: string[];
}

@Injectable()
export class IntentClassifierService {
  classify(text: string): ClassificationResult {
    const clean = text.toLowerCase();
    const cues: string[] = [];
    let urgency = 2; // Default normal urgency

    // Urgency indicators
    if (/(urgent|emergency|asap|immediately|khub emergency|taratari|ekhon e)/i.test(clean)) {
      urgency = 5;
      cues.push('high_urgency_keyword');
    } else if (/\b(today|delay|late|waiting|onek din)\b/i.test(clean)) {
      urgency = 3;
      cues.push('time_sensitive_keyword');
    }

    if (/!{2,}|\?{2,}/.test(text)) {
      urgency = Math.min(5, urgency + 1);
      cues.push('punctuation_emphasis');
    }

    // Sentiment analysis
    let sentiment: CustomerSentiment = 'neutral';
    if (/(terrible|horrible|angry|disaster|scam|worst|furious|kharap|fuchka|baje)/i.test(clean)) {
      sentiment = 'frustrated';
      urgency = Math.max(urgency, 4);
      cues.push('frustrated_sentiment');
    } else if (/(not working|broken|defective|delay|problem|shomossha|bhul)/i.test(clean)) {
      sentiment = 'negative';
      cues.push('negative_sentiment');
    } else if (/(thank|thanks|great|good|excellent|dhonnobad|valo)/i.test(clean)) {
      sentiment = 'positive';
      cues.push('positive_sentiment');
    }

    // Intent detection
    let intent: CustomerIntent = 'general_support';
    let confidence = 0.8;

    if (/(refund|money back|return|replace|taka ferot|ferot)/i.test(clean)) {
      intent = 'refund_request';
      confidence = 0.95;
      cues.push('refund_intent');
    } else if (/(where is my|track|status|kobe pabo|kothay|order #)/i.test(clean)) {
      intent = 'order_tracking';
      confidence = 0.94;
      cues.push('order_tracking_intent');
    } else if (/\b(courier|delivery|delay|in transit|hub|customs|stuck)\b/i.test(clean)) {
      intent = 'courier_delay';
      confidence = 0.92;
      cues.push('courier_intent');
    } else if (/(price|specs|how to|feature|specification)/i.test(clean)) {
      intent = 'product_inquiry';
      confidence = 0.85;
      cues.push('product_inquiry_intent');
    }

    return {
      intent,
      confidence,
      sentiment,
      urgency,
      cues,
    };
  }
}

