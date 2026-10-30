import { Module } from '@nestjs/common';
import { QaService } from './qa.service';
import { QaController } from './qa.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../common/tenancy/tenancy.module';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Module({
  imports: [AuditModule, AuthModule, TenancyModule],
  controllers: [QaController],
  providers: [QaService, StructuredLoggerService],
  exports: [QaService],
})
export class QaModule {}
