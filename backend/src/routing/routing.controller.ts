import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@servora/common';
import { RoutingService } from './routing.service';
import { RoutingSignals, ManualOverrideDto } from './routing.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantContextService } from '../common/tenancy/tenant-context.service';

@Controller('api/routing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutingController {
  constructor(
    private readonly routingService: RoutingService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('evaluate')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async evaluateRouting(
    @Body() signals: RoutingSignals,
    @Query('mode') mode?: 'SHADOW' | 'ACTIVE',
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.routingService.evaluateRouting(signals, tenantId, mode || 'SHADOW');
  }

  @Post('override')
  @Roles(UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async applyManualOverride(
    @Body() dto: ManualOverrideDto,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const managerId = userHeader || this.tenantContext.getUserId() || 'manager-1';
    return this.routingService.applyManualOverride(dto, tenantId, managerId);
  }

  @Get('agents')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async listAgents(@Headers('x-tenant-id') tenantHeader?: string) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    return this.routingService.listAgents(tenantId);
  }
}
