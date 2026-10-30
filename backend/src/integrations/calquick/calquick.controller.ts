import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CalQuickService } from './calquick.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';
import { ApiResponse } from '@servora/common';

@Controller('calquick')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalQuickController {
  constructor(private readonly calquickService: CalQuickService) {}

  @Get('order/:orderId')
  async lookupOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const order = await this.calquickService.lookupOrder(orderId, user.tenantId);
    return {
      success: true,
      data: order,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('courier/:trackingNumber')
  async checkCourier(
    @Param('trackingNumber') trackingNumber: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const courier = await this.calquickService.checkCourierStatus(trackingNumber, user.tenantId);
    return {
      success: true,
      data: courier,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('health')
  async getHealth(@Req() req: Request): Promise<ApiResponse<any>> {
    const health = await this.calquickService.getHealth();
    return {
      success: health.status === 'healthy',
      data: health,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

