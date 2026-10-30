import { Module } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { ToolsController } from './tools.controller';
import { CalQuickModule } from '../integrations/calquick/calquick.module';
import { RagModule } from '../rag/rag.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [CalQuickModule, RagModule, AuthModule, AuditModule, AiModule],
  controllers: [ToolsController],
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolsModule {}

