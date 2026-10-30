import { Module } from '@nestjs/common';
import { MockLlmProvider } from './providers/mock.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { ProviderRouterService } from './providers/provider-router.service';
import { BudgetService } from './governance/budget.service';
import { PiiService } from './safety/pii.service';
import { PromptInjectionService } from './safety/prompt-injection.service';
import { LanguageDetectorService } from './language/language-detector.service';
import { IntentClassifierService } from './language/intent-classifier.service';
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service';
import { AiController } from './orchestrator/ai.controller';
import { InboxModule } from '../inbox/inbox.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [InboxModule, AuthModule],
  controllers: [AiController],
  providers: [
    MockLlmProvider,
    GeminiProvider,
    OpenAiProvider,
    ProviderRouterService,
    BudgetService,
    PiiService,
    PromptInjectionService,
    LanguageDetectorService,
    IntentClassifierService,
    AiOrchestratorService,
  ],
  exports: [
    AiOrchestratorService,
    ProviderRouterService,
    BudgetService,
    PiiService,
    PromptInjectionService,
    LanguageDetectorService,
    IntentClassifierService,
  ],
})
export class AiModule {}

