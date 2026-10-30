import { Injectable } from '@nestjs/common';

export interface PiiDetectionResult {
  hasPii: boolean;
  detectedTypes: string[];
  redactedText: string;
}

@Injectable()
export class PiiService {
  // Regex patterns for sensitive entity detection
  private readonly emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private readonly phoneRegex = /(\+880\s?1[3-9]\d{8}|01[3-9]\d{8}|\+?1[2-9]\d{2}[2-9]\d{6}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/g;
  private readonly cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  private readonly nidRegex = /\b(\d{10}|\d{13}|\d{17})\b/g;
  private readonly secretRegex = /(api[_-]?key|secret|password|bearer)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{8,})['"]?/gi;

  redact(input: string): PiiDetectionResult {
    const detectedTypes: string[] = [];
    let redacted = input;

    // Detect & Redact Credit Cards first (to avoid phone regex overlaps)
    if (this.cardRegex.test(redacted)) {
      detectedTypes.push('credit_card');
      redacted = redacted.replace(this.cardRegex, '[REDACTED_CARD]');
    }

    // Detect & Redact Emails
    if (this.emailRegex.test(redacted)) {
      detectedTypes.push('email');
      redacted = redacted.replace(this.emailRegex, '[REDACTED_EMAIL]');
    }

    // Detect & Redact Phone Numbers
    if (this.phoneRegex.test(redacted)) {
      detectedTypes.push('phone');
      redacted = redacted.replace(this.phoneRegex, '[REDACTED_PHONE]');
    }

    // Detect & Redact Passwords / Secrets
    if (this.secretRegex.test(redacted)) {
      detectedTypes.push('secret');
      redacted = redacted.replace(this.secretRegex, '$1: [REDACTED_SECRET]');
    }

    return {
      hasPii: detectedTypes.length > 0,
      detectedTypes,
      redactedText: redacted,
    };
  }
}

