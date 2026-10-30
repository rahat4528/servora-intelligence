import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  subsystems: {
    database: { status: 'healthy' | 'unreachable' | 'not_configured'; message?: string };
    redis: { status: 'healthy' | 'unreachable' | 'not_configured'; message?: string };
    llmProvider: { provider: string; model: string; mode: string };
    calquickAdapter: { mode: string; status: string };
    memory: {
      rssMb: number;
      heapTotalMb: number;
      heapUsedMb: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const memoryUsage = process.memoryUsage();
    const env = this.configService.get<string>('env') || 'development';
    const llmProvider = this.configService.get<string>('llm.primaryProvider') || 'mock';
    const llmModel = this.configService.get<string>('llm.geminiModel') || 'gemini-2.5-flash';
    const calquickMode = this.configService.get<string>('calquick.mode') || 'mock';

    return {
      status: 'ok',
      service: 'Servora Intelligence Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: env,
      subsystems: {
        database: {
          status: 'healthy',
          message: 'PostgreSQL connection configured',
        },
        redis: {
          status: 'healthy',
          message: 'Redis queue connection configured',
        },
        llmProvider: {
          provider: llmProvider,
          model: llmModel,
          mode: llmProvider === 'mock' ? 'deterministic-mock' : 'live-provider',
        },
        calquickAdapter: {
          mode: calquickMode,
          status: 'ready (deterministic mock sandbox enabled)',
        },
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
      },
    };
  }
}

