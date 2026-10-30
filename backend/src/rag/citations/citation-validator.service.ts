import { Injectable } from '@nestjs/common';
import { RetrievedChunk } from '../retrieval/retrieval.service';

export interface CitationValidationResult {
  isValid: boolean;
  validCitations: string[];
  hallucinatedCitations: string[];
  sanitizedResponse: string;
}

@Injectable()
export class CitationValidatorService {
  /**
   * Validates all citations in an AI response against the chunks actually retrieved.
   * Discards or flags hallucinated / fabricated citations.
   */
  validateCitations(responseText: string, retrievedChunks: RetrievedChunk[]): CitationValidationResult {
    const validCitations: string[] = [];
    const hallucinatedCitations: string[] = [];

    // Extract citation patterns like [Source: Refund Policy — Section 3] or Sources: [Refund Policy — Section 3]
    const citationRegex = /\[(?:Source:\s*)?(.*?)\]/g;
    const matches = Array.from(responseText.matchAll(citationRegex));

    const retrievedTitles = retrievedChunks.map((c) => c.chunk.sourceTitle.toLowerCase());
    const retrievedSections = retrievedChunks.map((c) => (c.chunk.section || '').toLowerCase());
    const retrievedCitations = retrievedChunks.map((c) => c.citationString.toLowerCase());

    for (const match of matches) {
      const citedString = match[1].trim();
      const citedLower = citedString.toLowerCase();

      // Check if citation accurately references any retrieved chunk
      const isGrounded =
        retrievedCitations.some((rc) => rc.includes(citedLower) || citedLower.includes(rc)) ||
        retrievedTitles.some((rt) => citedLower.includes(rt));

      if (isGrounded) {
        if (!validCitations.includes(citedString)) {
          validCitations.push(citedString);
        }
      } else {
        if (!hallucinatedCitations.includes(citedString)) {
          hallucinatedCitations.push(citedString);
        }
      }
    }

    let sanitizedResponse = responseText;
    // Strip hallucinated citations from final customer-facing output to prevent misinformation
    for (const fake of hallucinatedCitations) {
      sanitizedResponse = sanitizedResponse.replace(`[${fake}]`, '').replace(`Sources: [${fake}]`, '');
    }

    return {
      isValid: hallucinatedCitations.length === 0,
      validCitations,
      hallucinatedCitations,
      sanitizedResponse: sanitizedResponse.trim(),
    };
  }
}

