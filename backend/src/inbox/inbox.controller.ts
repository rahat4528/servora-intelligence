import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  InboxService,
  ListConversationsFilter,
  CreateConversationDto,
  ConversationRecord,
  MessageRecord,
  InternalNoteRecord,
} from './inbox.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import {
  ConversationStatus,
  MessageSenderType,
  ApiResponse,
} from '@servora/common';

@Controller('inbox')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ListConversationsFilter,
    @Req() req: Request,
  ): Promise<ApiResponse<ConversationRecord[]>> {
    const result = this.inboxService.listConversations(user.tenantId, filter);
    return {
      success: true,
      data: result.items,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit) || 1,
        },
      },
    };
  }

  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ConversationRecord>> {
    const conv = this.inboxService.getConversationById(id, user.tenantId);
    return {
      success: true,
      data: conv,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('conversations')
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
    @Req() req: Request,
  ): Promise<ApiResponse<ConversationRecord>> {
    const conv = await this.inboxService.createConversation(user.tenantId, dto);
    return {
      success: true,
      data: conv,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('content') content: string,
    @Req() req: Request,
  ): Promise<ApiResponse<MessageRecord>> {
    const msg = await this.inboxService.addMessage(id, user.tenantId, {
      senderType: MessageSenderType.AGENT,
      senderId: user.id,
      senderName: user.name,
      content,
    });

    return {
      success: true,
      data: msg,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('conversations/:id/notes')
  async addInternalNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('content') content: string,
    @Req() req: Request,
  ): Promise<ApiResponse<InternalNoteRecord>> {
    const note = await this.inboxService.addInternalNote(
      id,
      user.tenantId,
      user.id,
      user.name,
      content,
    );

    return {
      success: true,
      data: note,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put('conversations/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('status') status: ConversationStatus,
    @Req() req: Request,
  ): Promise<ApiResponse<ConversationRecord>> {
    const updated = await this.inboxService.updateStatus(id, user.tenantId, status, user.id);
    return {
      success: true,
      data: updated,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put('conversations/:id/assign')
  async assignAgent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('agentId') agentId: string,
    @Req() req: Request,
  ): Promise<ApiResponse<ConversationRecord>> {
    const updated = await this.inboxService.assignAgent(id, user.tenantId, agentId, user.id);
    return {
      success: true,
      data: updated,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

