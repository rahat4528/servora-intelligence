import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  AiOrchestratorService,
  AiSummaryResult,
  AiSuggestedReplyResult,
} from './ai-orchestrator.service';
import { BudgetService } from '../governance/budget.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';
import { ApiResponse } from '@servora/common';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly aiOrchestratorService: AiOrchestratorService,
    private readonly budgetService: BudgetService,
  ) {}

  @Get('summarize/:conversationId')
  async summarize(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<AiSummaryResult>> {
    const result = await this.aiOrchestratorService.generateConversationSummary(
      conversationId,
      user.tenantId,
    );

    return {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('suggest-reply/:conversationId')
  async suggestReply(
    @Param('conversationId') conversationId: string,
    @Body('knowledgeContext') knowledgeContext: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<AiSuggestedReplyResult>> {
    const result = await this.aiOrchestratorService.generateSuggestedReply(
      conversationId,
      user.tenantId,
      knowledgeContext,
    );

    return {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('budget-status')
  async getBudgetStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const status = this.budgetService.checkBudget(user.tenantId);
    return {
      success: true,
      data: status,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

