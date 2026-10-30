import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../ingestion/embedding.service';
import { KnowledgeIngestionService, KnowledgeChunkRecord } from '../ingestion/knowledge-ingestion.service';

export interface RetrievedChunk {
  chunk: KnowledgeChunkRecord;
  similarityScore: number;
  lexicalScore: number;
  combinedScore: number;
  citationString: string;
}

export interface RetrievalResult {
  query: string;
  tenantId: string;
  chunks: RetrievedChunk[];
  contextText: string;
  executionTimeMs: number;
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly ingestionService: KnowledgeIngestionService,
  ) {}

  async retrieveRelevantKnowledge(
    tenantId: string,
    query: string,
    topK: number = 3,
    minThreshold: number = 0.25,
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const queryVector = await this.embeddingService.generateEmbedding(query);
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    // Strict tenant isolation: fetch ONLY chunks belonging to tenantId
    const tenantChunks = this.ingestionService.getAllChunksForTenant(tenantId);
    const scoredChunks: RetrievedChunk[] = [];

    for (const chunk of tenantChunks) {
      // 1. Vector cosine similarity
      const similarityScore = this.embeddingService.cosineSimilarity(queryVector, chunk.embedding);

      // 2. Lexical keyword matching
      const contentLower = chunk.content.toLowerCase();
      let matchedTerms = 0;
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          matchedTerms += 1;
        }
      }
      const lexicalScore = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0;

      // 3. Hybrid combined score
      const combinedScore = parseFloat((0.7 * similarityScore + 0.3 * lexicalScore).toFixed(4));

      if (combinedScore >= minThreshold) {
        scoredChunks.push({
          chunk,
          similarityScore,
          lexicalScore,
          combinedScore,
          citationString: `${chunk.sourceTitle} — ${chunk.section || 'General'}`,
        });
      }
    }

    // Sort descending by combined score
    scoredChunks.sort((a, b) => b.combinedScore - a.combinedScore);
    const topChunks = scoredChunks.slice(0, topK);

    // Format context text with citations
    const contextLines = topChunks.map(
      (c, idx) => `[Source ${idx + 1}: ${c.citationString}]\n${c.chunk.content.trim()}`,
    );
    const contextText = contextLines.join('\n\n');

    return {
      query,
      tenantId,
      chunks: topChunks,
      contextText,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

