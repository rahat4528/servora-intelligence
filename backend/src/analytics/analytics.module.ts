import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { InboxModule } from '../inbox/inbox.module';
import { QaModule } from '../qa/qa.module';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../common/tenancy/tenancy.module';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Module({
  imports: [
    InboxModule,
    QaModule,
    AiModule,
    AuditModule,
    AuthModule,
    TenancyModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, StructuredLoggerService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
