import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { validateEnvironment } from './common/config/env.validation';
import { FeatureFlagsModule } from './common/feature-flags/feature-flags.module';
import { StructuredLoggerService } from './common/logging/structured-logger.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { CryptoModule } from './common/crypto/crypto.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { InboxModule } from './inbox/inbox.module';
import { RagModule } from './rag/rag.module';
import { CalQuickModule } from './integrations/calquick/calquick.module';
import { ToolsModule } from './tools/tools.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    CryptoModule,
    TenancyModule,
    FeatureFlagsModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AuditModule,
    InboxModule,
    RagModule,
    CalQuickModule,
    ToolsModule,
    ApprovalsModule,
    AiModule,
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
