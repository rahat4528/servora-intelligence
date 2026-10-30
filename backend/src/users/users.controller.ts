import { Controller, Get, Post, Put, Body, Req, UseGuards, Param } from '@nestjs/common';
import { Request } from 'express';
import { UsersService, AgentProfile } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { UserRole, ApiResponse } from '@servora/common';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPPORT_MANAGER)
  async getTenantUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const users = this.usersService.getUsersForTenant(user.tenantId);
    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { email: string; name: string; password: string; role: UserRole },
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const created = await this.usersService.createUser(user.tenantId, user.id, body);
    return {
      success: true,
      data: {
        id: created.id,
        tenantId: created.tenantId,
        email: created.email,
        name: created.name,
        role: created.role,
      },
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('agents')
  async getAgents(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<AgentProfile[]>> {
    const agents = this.usersService.getAgentsForTenant(user.tenantId);
    return {
      success: true,
      data: agents,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put('agents/status')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body('status') status: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
    @Req() req: Request,
  ): Promise<ApiResponse<AgentProfile>> {
    const updated = await this.usersService.updateAgentStatus(user.id, user.tenantId, status);
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

