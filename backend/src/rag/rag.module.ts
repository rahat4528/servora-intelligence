import { Module } from '@nestjs/common';
import { EmbeddingService } from './ingestion/embedding.service';
import { KnowledgeIngestionService } from './ingestion/knowledge-ingestion.service';
import { RetrievalService } from './retrieval/retrieval.service';
import { CitationValidatorService } from './citations/citation-validator.service';
import { KnowledgeController } from './knowledge.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [KnowledgeController],
  providers: [
    EmbeddingService,
    KnowledgeIngestionService,
    RetrievalService,
    CitationValidatorService,
  ],
  exports: [
    EmbeddingService,
    KnowledgeIngestionService,
    RetrievalService,
    CitationValidatorService,
  ],
})
export class RagModule {}

