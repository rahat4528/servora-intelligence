import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuditService, QueryAuditEventsFilter } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { UserRole, ApiResponse } from '@servora/common';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPPORT_MANAGER)
  async getAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: QueryAuditEventsFilter,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    // Tenant is strictly bound from authenticated user's JWT token
    const result = await this.auditService.getEventsForTenant(user.tenantId, filter);

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
}

