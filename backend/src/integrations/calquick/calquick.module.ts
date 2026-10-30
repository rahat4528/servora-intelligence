import { Module } from '@nestjs/common';
import { CalQuickMockAdapter } from './calquick-mock.adapter';
import { CalQuickLiveAdapter } from './calquick-live.adapter';
import { CalQuickService } from './calquick.service';
import { CalQuickController } from './calquick.controller';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CalQuickController],
  providers: [CalQuickMockAdapter, CalQuickLiveAdapter, CalQuickService],
  exports: [CalQuickService],
})
export class CalQuickModule {}

