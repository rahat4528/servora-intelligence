import {
  Controller,
  Get,
  Query,
  Headers,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@servora/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantContextService } from '../common/tenancy/tenant-context.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async getDashboard(
    @Query('days') days?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const windowDays = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getDashboard(tenantId, windowDays);
  }

  @Get('export')
  @Roles(UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async exportAnalytics(
    @Query('format') format: 'csv' | 'json' = 'json',
    @Query('days') days?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Res() res?: Response,
  ) {
    const tenantId = tenantHeader || this.tenantContext.getTenantId() || 'tenant-default';
    const windowDays = days ? parseInt(days, 10) : 30;
    const content = await this.analyticsService.exportAnalytics(tenantId, format, windowDays);

    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="servora-analytics.csv"');
      return res.send(content);
    }

    if (res) {
      res.setHeader('Content-Type', 'application/json');
      return res.send(content);
    }

    return content;
  }

  @Get('model-comparison')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.SUPPORT_MANAGER, UserRole.TENANT_ADMIN)
  async getModelComparison() {
    return this.analyticsService.getModelComparison();
  }
}
