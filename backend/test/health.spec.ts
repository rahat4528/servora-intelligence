import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../src/health/health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'env') return 'test';
              if (key === 'llm.primaryProvider') return 'mock';
              if (key === 'llm.geminiModel') return 'gemini-2.5-flash';
              if (key === 'calquick.mode') return 'mock';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return healthy status with required Servora Intelligence metadata', async () => {
    const health = await service.checkHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('Servora Intelligence Backend');
    expect(health.version).toBe('1.0.0');
    expect(health.environment).toBe('test');
    expect(health.subsystems).toBeDefined();
    expect(health.subsystems.database.status).toBe('healthy');
    expect(health.subsystems.redis.status).toBe('healthy');
    expect(health.subsystems.llmProvider.provider).toBe('mock');
    expect(health.subsystems.calquickAdapter.mode).toBe('mock');
  });
});

