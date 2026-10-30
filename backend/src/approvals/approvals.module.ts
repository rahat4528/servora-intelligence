import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { CalQuickModule } from '../integrations/calquick/calquick.module';
import { AuditModule } from '../audit/audit.module';
import { TenantsModule } from '../tenants/tenants.module';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Module({
  imports: [CalQuickModule, AuditModule, TenantsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, StructuredLoggerService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
