import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from './embedding.service';
import { AuditService } from '../../audit/audit.service';

export interface KnowledgeSourceRecord {
  id: string;
  tenantId: string;
  title: string;
  sourceType: 'POLICY' | 'FAQ' | 'MANUAL' | 'DOCUMENT';
  version: number;
  status: 'INGESTED' | 'PROCESSING' | 'FAILED';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunkRecord {
  id: string;
  tenantId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  section?: string;
  pageNumber?: number;
  embedding: number[];
  createdAt: string;
}

@Injectable()
export class KnowledgeIngestionService {
  private sources: Map<string, KnowledgeSourceRecord> = new Map();
  private chunks: Map<string, KnowledgeChunkRecord[]> = new Map();

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly auditService: AuditService,
  ) {
    this.seedDefaultKnowledgeBase();
  }

  private async seedDefaultKnowledgeBase() {
    const tenantDefault = 'tenant-default';

    // Document 1: Refund Policy
    await this.ingestDocument({
      tenantId: tenantDefault,
      title: 'Refund and Return Policy',
      sourceType: 'POLICY',
      version: 1,
      content: `
Section 1: Return Eligibility
Customers are eligible to request a return or replacement within 14 days of confirmed package delivery.
Items must be in original condition with intact packaging.

Section 2: Defective or Damaged Products
If an item arrives damaged or mechanically defective, the customer is entitled to an immediate replacement or full refund.
Photographic proof of damage is required to initiate the review.

Section 3: Manager Approval & Submission
All financial refunds require explicit authorization from an authorized Support Manager.
Once approved, the refund draft is securely submitted through the CalQuick merchant portal.
`,
    });

    // Document 2: Courier Guidelines
    await this.ingestDocument({
      tenantId: tenantDefault,
      title: 'CalQuick Delivery Guidelines',
      sourceType: 'MANUAL',
      version: 1,
      content: `
Section 1: Standard Delivery Timelines
Within Dhaka metropolitan area, deliveries are typically fulfilled within 24 to 48 hours.
Nationwide deliveries outside Dhaka require 3 to 5 business days.

Section 2: Hub Transit Delays
If a courier tracking status shows "Hub Transit" or "Customs Clearance" for more than 48 hours, agents must verify courier dispatch logs.
Customers inquiring in Banglish ("amar order kobe pabo") should receive immediate tracking reassurance.
`,
    });

    // Document 3: Isolated Acme SLA for cross-tenant testing
    await this.ingestDocument({
      tenantId: 'tenant-isolated',
      title: 'Acme Corporate SLA Agreement',
      sourceType: 'DOCUMENT',
      version: 1,
      content: `
Section 1: VIP 1-Hour SLA
Acme VIP clients receive dedicated 1-hour resolution guarantee with custom direct account manager support.
`,
    });
  }

  async ingestDocument(params: {
    tenantId: string;
    title: string;
    sourceType: KnowledgeSourceRecord['sourceType'];
    version?: number;
    content: string;
  }): Promise<KnowledgeSourceRecord> {
    const sourceId = `src-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const rawSections = params.content
      .split(/(?=Section \d+:)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const generatedChunks: KnowledgeChunkRecord[] = [];

    for (let index = 0; index < rawSections.length; index++) {
      const sectionContent = rawSections[index];
      const sectionMatch = sectionContent.match(/Section \d+:\s*([^\n\r]+)/);
      const sectionName = sectionMatch ? sectionMatch[0] : `Section ${index + 1}`;

      const embedding = await this.embeddingService.generateEmbedding(sectionContent);

      generatedChunks.push({
        id: `chk-${uuidv4().slice(0, 8)}`,
        tenantId: params.tenantId,
        sourceId,
        sourceTitle: params.title,
        chunkIndex: index,
        content: sectionContent,
        section: sectionName,
        pageNumber: index + 1,
        embedding,
        createdAt: now,
      });
    }

    const sourceRecord: KnowledgeSourceRecord = {
      id: sourceId,
      tenantId: params.tenantId,
      title: params.title,
      sourceType: params.sourceType,
      version: params.version || 1,
      status: 'INGESTED',
      chunkCount: generatedChunks.length,
      createdAt: now,
      updatedAt: now,
    };

    this.sources.set(sourceId, sourceRecord);
    this.chunks.set(sourceId, generatedChunks);

    await this.auditService.recordEvent({
      tenantId: params.tenantId,
      userId: 'system',
      eventType: 'KNOWLEDGE_DOCUMENT_INGESTED',
      resourceType: 'knowledge_source',
      resourceId: sourceId,
      action: 'INGEST',
      details: { title: params.title, chunkCount: generatedChunks.length },
    });

    return sourceRecord;
  }

  getSourcesForTenant(tenantId: string): KnowledgeSourceRecord[] {
    return Array.from(this.sources.values()).filter((s) => s.tenantId === tenantId);
  }

  getAllChunksForTenant(tenantId: string): KnowledgeChunkRecord[] {
    const tenantSources = this.getSourcesForTenant(tenantId).map((s) => s.id);
    const allChunks: KnowledgeChunkRecord[] = [];
    tenantSources.forEach((srcId) => {
      const srcChunks = this.chunks.get(srcId) || [];
      allChunks.push(...srcChunks);
    });
    return allChunks;
  }
}

