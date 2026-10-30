import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@servora/common';
import { ApprovalsService } from './approvals.service';
import { PrepareRefundDto, ReviewProposalDto, ApprovalStatus } from './approval.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantContextService } from '../common/tenancy/tenant-context.service';

@Controller('api/approvals/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('prepare')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async prepareProposal(
    @Body() dto: PrepareRefundDto,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const userId = userHeader || this.tenantContext.getUserId() || 'user-agent';
    return this.approvalsService.prepareRefundProposal(dto, tenantId, userId);
  }

  @Get()
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async listProposals(
    @Query('status') status?: ApprovalStatus,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.approvalsService.listProposals(tenantId, status);
  }

  @Get(':id')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async getProposal(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.approvalsService.getProposal(id, tenantId);
  }

  @Post(':id/review')
  @Roles(UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async reviewProposal(
    @Param('id') id: string,
    @Body() dto: ReviewProposalDto,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const userId = userHeader || this.tenantContext.getUserId() || 'user-manager';
    const role = roleHeader || 'SUPPORT_MANAGER';
    return this.approvalsService.reviewProposal(id, dto, tenantId, userId, role);
  }

  @Post(':id/execute')
  @Roles(UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async executeRefund(
    @Param('id') id: string,
    @Headers('x-idempotency-key') idempotencyKey?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Header "x-idempotency-key" is required to execute a refund');
    }
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const userId = userHeader || this.tenantContext.getUserId() || 'user-manager';
    const role = roleHeader || 'SUPPORT_MANAGER';
    return this.approvalsService.executeRefund(id, idempotencyKey, tenantId, userId, role);
  }
}
