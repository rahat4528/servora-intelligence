import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { HealthCheckResult, HealthService } from './health.service';
import { ApiResponse } from '@servora/common';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Req() req: Request): Promise<ApiResponse<HealthCheckResult>> {
    const health = await this.healthService.checkHealth();
    return {
      success: health.status === 'ok',
      data: health,
      meta: {
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

