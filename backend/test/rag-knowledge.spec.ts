import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingService } from '../src/rag/ingestion/embedding.service';
import { KnowledgeIngestionService } from '../src/rag/ingestion/knowledge-ingestion.service';
import { RetrievalService } from '../src/rag/retrieval/retrieval.service';
import { CitationValidatorService } from '../src/rag/citations/citation-validator.service';
import { AuditService } from '../src/audit/audit.service';
import { StructuredLoggerService } from '../src/common/logging/structured-logger.service';

describe('Knowledge Intelligence & Citation Validation Suite (Phase 4 CI Gate)', () => {
  let embeddingService: EmbeddingService;
  let ingestionService: KnowledgeIngestionService;
  let retrievalService: RetrievalService;
  let citationValidator: CitationValidatorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        EmbeddingService,
        KnowledgeIngestionService,
        RetrievalService,
        CitationValidatorService,
        AuditService,
        StructuredLoggerService,
      ],
    }).compile();

    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    ingestionService = module.get<KnowledgeIngestionService>(KnowledgeIngestionService);
    retrievalService = module.get<RetrievalService>(RetrievalService);
    citationValidator = module.get<CitationValidatorService>(CitationValidatorService);
  });

  describe('1. Document Ingestion & Chunking', () => {
    it('should split ingested document into semantic sections and store embeddings', async () => {
      const source = await ingestionService.ingestDocument({
        tenantId: 'tenant-default',
        title: 'Warranty & Replacement Guide',
        sourceType: 'POLICY',
        content: `
Section 1: Standard Warranty
All electronics are covered under a 1-year manufacturer warranty.

Section 2: Accidental Damage
Accidental spills and physical impact are excluded from warranty coverage.
`,
      });

      expect(source.id).toBeDefined();
      expect(source.chunkCount).toBe(2);

      const allChunks = ingestionService.getAllChunksForTenant('tenant-default');
      const docChunks = allChunks.filter((c) => c.sourceId === source.id);
      expect(docChunks.length).toBe(2);
      expect(docChunks[0].embedding.length).toBeGreaterThan(0);
    });
  });

  describe('2. Strict Multi-Tenant Knowledge Isolation', () => {
    it('should make Tenant A knowledge completely invisible to Tenant B', async () => {
      // Tenant B ('tenant-isolated') queries for "refund policy"
      const resultB = await retrievalService.retrieveRelevantKnowledge(
        'tenant-isolated',
        'What is the refund and return window?',
      );

      // Should NOT retrieve Tenant A's refund policy!
      expect(
        resultB.chunks.some((c) => c.chunk.sourceTitle.includes('Refund and Return Policy')),
      ).toBe(false);

      // But Tenant A querying the exact same query DOES retrieve the refund policy
      const resultA = await retrievalService.retrieveRelevantKnowledge(
        'tenant-default',
        'What is the refund and return window?',
      );

      expect(
        resultA.chunks.some((c) => c.chunk.sourceTitle.includes('Refund and Return Policy')),
      ).toBe(true);
    });
  });

  describe('3. Automated Citation Validation & Hallucination Rejection', () => {
    it('should accept verified citations matching retrieved chunks', async () => {
      const retrieval = await retrievalService.retrieveRelevantKnowledge(
        'tenant-default',
        'How many days do I have to return an item?',
      );

      const realResponse =
        'According to the policy, customers can return items within 14 days. Sources: [Refund and Return Policy — Section 1: Return Eligibility]';

      const validation = citationValidator.validateCitations(realResponse, retrieval.chunks);
      expect(validation.isValid).toBe(true);
      expect(validation.validCitations.length).toBeGreaterThan(0);
      expect(validation.hallucinatedCitations.length).toBe(0);
    });

    it('should reject fabricated / hallucinated citations that do not exist in retrieved sources', async () => {
      const retrieval = await retrievalService.retrieveRelevantKnowledge(
        'tenant-default',
        'How many days do I have to return an item?',
      );

      const fakeResponse =
        'You can return anytime in 60 days. Sources: [Fabricated Supreme Policy — Section 99: Never Ending Returns]';

      const validation = citationValidator.validateCitations(fakeResponse, retrieval.chunks);
      expect(validation.isValid).toBe(false);
      expect(validation.hallucinatedCitations).toContain(
        'Fabricated Supreme Policy — Section 99: Never Ending Returns',
      );
      expect(validation.sanitizedResponse).not.toContain('Fabricated Supreme Policy');
    });
  });

  describe('4. Banglish and Multilingual Retrieval Benchmarks', () => {
    it('should retrieve CalQuick transit delay chunk for Banglish inquiry', async () => {
      const banglishQuery = 'Bhai amar order kobe pabo? Hub e delay hocche.';
      const result = await retrievalService.retrieveRelevantKnowledge('tenant-default', banglishQuery);

      expect(result.chunks.length).toBeGreaterThan(0);
      const matchedGuidelines = result.chunks.some((c) =>
        c.chunk.sourceTitle.includes('CalQuick Delivery Guidelines'),
      );
      expect(matchedGuidelines).toBe(true);
    });

    it('should retrieve refund policy chunk for Bengali script inquiry', async () => {
      const banglaQuery = 'নষ্ট প্রডাক্টের রিফান্ড পলিসি কি?';
      const result = await retrievalService.retrieveRelevantKnowledge('tenant-default', banglaQuery);

      expect(result.chunks.length).toBeGreaterThan(0);
      const matchedRefund = result.chunks.some((c) =>
        c.chunk.sourceTitle.includes('Refund and Return Policy'),
      );
      expect(matchedRefund).toBe(true);
    });
  });
});

