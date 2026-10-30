import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../common/tenancy/tenancy.module';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';

@Module({
  imports: [AuditModule, AuthModule, TenancyModule],
  controllers: [RoutingController],
  providers: [RoutingService, StructuredLoggerService],
  exports: [RoutingService],
})
export class RoutingModule {}
