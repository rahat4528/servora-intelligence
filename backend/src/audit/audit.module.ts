import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuthModule } from '../auth/auth.module';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService, StructuredLoggerService],
  exports: [AuditService, StructuredLoggerService],
})
export class AuditModule {}

