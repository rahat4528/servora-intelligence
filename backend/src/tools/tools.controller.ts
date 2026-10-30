import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ToolRegistryService } from './tool-registry.service';
import { ToolDefinition, ToolExecutionRecord, ToolExecutionResult } from './tool-registry.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { ApiResponse } from '@servora/common';

@Controller('tools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ToolsController {
  constructor(private readonly toolRegistryService: ToolRegistryService) {}

  @Get()
  getRegisteredTools(@Req() req: Request): ApiResponse<ToolDefinition[]> {
    const tools = this.toolRegistryService.getToolDefinitions();
    return {
      success: true,
      data: tools,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('execute')
  async executeTool(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { toolName: string; parameters: Record<string, any>; conversationId?: string },
    @Req() req: Request,
  ): Promise<ApiResponse<ToolExecutionResult>> {
    const result = await this.toolRegistryService.executeTool({
      toolName: body.toolName,
      parameters: body.parameters,
      tenantId: user.tenantId,
      conversationId: body.conversationId,
      userId: user.id,
    });

    return {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('history')
  getExecutionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('conversationId') conversationId: string | undefined,
    @Req() req: Request,
  ): ApiResponse<ToolExecutionRecord[]> {
    const history = this.toolRegistryService.getExecutionsForTenant(user.tenantId, conversationId);
    return {
      success: true,
      data: history,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

