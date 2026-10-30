import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly dimension = 128; // Standard compact vector dimension for deterministic evaluation

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a normalized semantic embedding vector.
   * In mock mode, uses deterministic character n-gram hashing and vocabulary mapping
   * to ensure mathematically sound cosine similarity for semantic and keyword queries.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const provider = this.configService.get<string>('llm.embeddingProvider') || 'mock';

    if (provider === 'gemini') {
      const apiKey = this.configService.get<string>('llm.geminiApiKey');
      const model = this.configService.get<string>('llm.embeddingModel') || 'text-embedding-004';
      if (apiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: `models/${model}`,
              content: { parts: [{ text }] },
            }),
          });
          if (res.ok) {
            const data: any = await res.json();
            const values: number[] = data.embedding?.values;
            if (values && values.length > 0) {
              return this.normalizeVector(values);
            }
          }
        } catch {
          // Degrade to deterministic fallback
        }
      }
    }

    return this.generateDeterministicVector(text);
  }

  /**
   * Computes deterministic pseudo-semantic vector representation based on term frequency
   * and character trigram hashing.
   */
  generateDeterministicVector(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const normalized = text.toLowerCase().trim();

    // Map keywords and trigrams to vector dimensions
    for (let i = 0; i < normalized.length - 2; i++) {
      const trigram = normalized.substring(i, i + 3);
      let hash = 0;
      for (let j = 0; j < trigram.length; j++) {
        hash = (hash << 5) - hash + trigram.charCodeAt(j);
        hash |= 0;
      }
      const index = Math.abs(hash) % this.dimension;
      vector[index] += 1;
    }

    // Give high weight to semantic keywords (returns, courier, refund, warranty, etc.)
    // Includes multilingual cross-lingual alignment for Bengali & Banglish terms
    const semanticWeights: Record<string, { targetTerm: string; weight: number }> = {
      refund: { targetTerm: 'refund', weight: 5 },
      return: { targetTerm: 'return', weight: 5 },
      courier: { targetTerm: 'courier', weight: 5 },
      delivery: { targetTerm: 'delivery', weight: 5 },
      delay: { targetTerm: 'delay', weight: 4 },
      damaged: { targetTerm: 'damaged', weight: 4 },
      defective: { targetTerm: 'defective', weight: 4 },
      warranty: { targetTerm: 'warranty', weight: 4 },
      policy: { targetTerm: 'policy', weight: 3 },
      kobe: { targetTerm: 'delivery', weight: 3 },
      ferot: { targetTerm: 'refund', weight: 4 },
      // Bengali script cross-lingual mappings
      'রিফান্ড': { targetTerm: 'refund', weight: 5 },
      'পলিসি': { targetTerm: 'policy', weight: 3 },
      'ফেরত': { targetTerm: 'refund', weight: 5 },
      'কুরিয়ার': { targetTerm: 'courier', weight: 5 },
      'ডেলিভারি': { targetTerm: 'delivery', weight: 5 },
      'নষ্ট': { targetTerm: 'defective', weight: 4 },
      'দেরি': { targetTerm: 'delay', weight: 4 },
    };

    Object.entries(semanticWeights).forEach(([term, config]) => {
      if (normalized.includes(term)) {
        let hash = 0;
        for (let j = 0; j < config.targetTerm.length; j++) {
          hash = (hash << 5) - hash + config.targetTerm.charCodeAt(j);
          hash |= 0;
        }
        const index = Math.abs(hash) % this.dimension;
        vector[index] += config.weight;
      }
    });

    return this.normalizeVector(vector);
  }

  /**
   * Normalizes vector to unit length (Euclidean L2 norm) for cosine similarity
   */
  normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map((val) => parseFloat((val / magnitude).toFixed(6)));
  }

  /**
   * Calculates cosine similarity between two normalized vectors
   */
  cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return 0;
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
    }
    return parseFloat(dotProduct.toFixed(4));
  }
}

