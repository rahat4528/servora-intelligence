import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TenantsService, TenantSettingsRecord } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { UserRole, ApiResponse } from '@servora/common';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  async getCurrentTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const tenant = this.tenantsService.getTenantById(user.tenantId, user.tenantId);
    const settings = this.tenantsService.getSettings(user.tenantId, user.tenantId);

    return {
      success: true,
      data: {
        ...tenant,
        settings,
      },
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put('settings')
  @Roles(UserRole.TENANT_ADMIN)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<TenantSettingsRecord>,
    @Req() req: Request,
  ): Promise<ApiResponse<TenantSettingsRecord>> {
    const updated = await this.tenantsService.updateSettings(
      user.tenantId,
      user.tenantId,
      user.id,
      body,
    );

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

