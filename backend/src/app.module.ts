import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { validateEnvironment } from './common/config/env.validation';
import { FeatureFlagsModule } from './common/feature-flags/feature-flags.module';
import { StructuredLoggerService } from './common/logging/structured-logger.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    FeatureFlagsModule,
    HealthModule,
  ],
  providers: [StructuredLoggerService],
  exports: [StructuredLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

