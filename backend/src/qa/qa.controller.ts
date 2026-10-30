import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@servora/common';
import { QaService } from './qa.service';
import { EvaluateConversationDto, ReviewQaDto, DisputeQaDto } from './qa.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantContextService } from '../common/tenancy/tenant-context.service';

@Controller('api/qa')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaController {
  constructor(
    private readonly qaService: QaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('evaluate')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async evaluateConversation(
    @Body() dto: EvaluateConversationDto,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.qaService.evaluateConversation(dto, tenantId);
  }

  @Get('evaluations')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async listEvaluations(@Headers('x-tenant-id') tenantHeader?: string) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.qaService.listEvaluations(tenantId);
  }

  @Get('evaluations/:id')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async getEvaluation(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.qaService.getEvaluation(id, tenantId);
  }

  @Post('evaluations/:id/review')
  @Roles(UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async reviewEvaluation(
    @Param('id') id: string,
    @Body() dto: ReviewQaDto,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const managerId = userHeader || this.tenantContext.getUserId() || 'manager-1';
    return this.qaService.reviewEvaluation(id, dto, tenantId, managerId);
  }

  @Post('evaluations/:id/dispute')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async disputeEvaluation(
    @Param('id') id: string,
    @Body() dto: DisputeQaDto,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const agentId = userHeader || this.tenantContext.getUserId() || 'agent-1';
    return this.qaService.disputeEvaluation(id, dto, tenantId, agentId);
  }

  @Get('agents/:agentId/coaching')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async getAgentCoachingSummary(
    @Param('agentId') agentId: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.qaService.getAgentCoachingSummary(agentId, tenantId);
  }
}
