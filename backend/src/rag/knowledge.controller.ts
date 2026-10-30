import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { KnowledgeIngestionService, KnowledgeSourceRecord } from './ingestion/knowledge-ingestion.service';
import { RetrievalService, RetrievalResult } from './retrieval/retrieval.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { UserRole, ApiResponse } from '@servora/common';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(
    private readonly ingestionService: KnowledgeIngestionService,
    private readonly retrievalService: RetrievalService,
  ) {}

  @Get('sources')
  async getSources(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<KnowledgeSourceRecord[]>> {
    const sources = this.ingestionService.getSourcesForTenant(user.tenantId);
    return {
      success: true,
      data: sources,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('ingest')
  @Roles(UserRole.TENANT_ADMIN)
  async ingestDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title: string; sourceType: any; content: string },
    @Req() req: Request,
  ): Promise<ApiResponse<KnowledgeSourceRecord>> {
    const source = await this.ingestionService.ingestDocument({
      tenantId: user.tenantId,
      title: body.title,
      sourceType: body.sourceType || 'DOCUMENT',
      content: body.content,
    });

    return {
      success: true,
      data: source,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('query')
  async queryKnowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Body('query') query: string,
    @Req() req: Request,
  ): Promise<ApiResponse<RetrievalResult>> {
    const result = await this.retrievalService.retrieveRelevantKnowledge(user.tenantId, query);
    return {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

