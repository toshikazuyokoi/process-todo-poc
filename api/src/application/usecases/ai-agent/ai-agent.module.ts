import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AIAgentController } from '../../../interfaces/controllers/ai-agent.controller';
import { StartInterviewSessionUseCase } from './start-interview-session.usecase';
import { GetInterviewSessionUseCase } from './get-interview-session.usecase';
import { EndInterviewSessionUseCase } from './end-interview-session.usecase';
import { ProcessUserMessageUseCase } from './process-user-message.usecase';
import { GetConversationHistoryUseCase } from './get-conversation-history.usecase';
import { CleanupExpiredSessionsUseCase } from './cleanup-expired-sessions.usecase';
import { CollectUserFeedbackUseCase } from './collect-user-feedback.usecase';
import { GenerateTemplateRecommendationsUseCase } from './generate-template-recommendations.usecase';
import { FinalizeTemplateCreationUseCase } from './finalize-template-creation.usecase';
import { SearchBestPracticesUseCase } from './search-best-practices.usecase';
import { SearchComplianceRequirementsUseCase } from './search-compliance-requirements.usecase';
import { SearchProcessBenchmarksUseCase } from './search-process-benchmarks.usecase';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { DomainModule } from '../../../domain/domain.module';
import { AI_CONVERSATION_RESPONDER } from '../../interfaces/ai-agent/ai-conversation-responder.interface';
import { AIConversationService } from '../../../domain/ai-agent/services/ai-conversation.service';
import { InfrastructureModule } from '../../../infrastructure/infrastructure.module';
import { WebSocketModule } from '../../../infrastructure/websocket/websocket.module';
import { AICacheModule } from '../../../infrastructure/cache/cache.module';
import { MonitoringModule } from '../../../infrastructure/monitoring/monitoring.module';
import { QueueModule } from '../../../infrastructure/queue/queue.module';
import { FeatureFlagService, AIFeatureFlagGuard } from '../../../infrastructure/security/ai-feature-flag.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DomainModule,
    InfrastructureModule,
    WebSocketModule,
    AICacheModule,
    MonitoringModule,
    QueueModule,
    KnowledgeBaseModule,
  ],
  controllers: [AIAgentController],
  providers: [
    // AI Agent helpers (PR1 stubs)
    require('../../../application/services/ai-agent/prompt-builder.service').PromptBuilder,
    require('../../../application/services/ai-agent/history-assembler.service').HistoryAssembler,
    require('../../../application/services/ai-agent/llm-output-parser.service').LLMOutputParser,
    require('../../../application/services/ai-agent/template-draft-mapper.service').TemplateDraftMapper,
    FeatureFlagService,
    AIFeatureFlagGuard,
    StartInterviewSessionUseCase,
    GetInterviewSessionUseCase,
    EndInterviewSessionUseCase,
    ProcessUserMessageUseCase,
    GetConversationHistoryUseCase,
    CleanupExpiredSessionsUseCase,
    CollectUserFeedbackUseCase,
    GenerateTemplateRecommendationsUseCase,
    FinalizeTemplateCreationUseCase,
    SearchBestPracticesUseCase,
    SearchComplianceRequirementsUseCase,
    SearchProcessBenchmarksUseCase,
    {
      provide: AI_CONVERSATION_RESPONDER,
      useExisting: AIConversationService,
    },
  ],
  exports: [
    StartInterviewSessionUseCase,
    GetInterviewSessionUseCase,
    EndInterviewSessionUseCase,
    ProcessUserMessageUseCase,
    GetConversationHistoryUseCase,
    CleanupExpiredSessionsUseCase,
    CollectUserFeedbackUseCase,
    GenerateTemplateRecommendationsUseCase,
    FinalizeTemplateCreationUseCase,
    SearchBestPracticesUseCase,
    SearchComplianceRequirementsUseCase,
    SearchProcessBenchmarksUseCase,
  ],
})
export class AIAgentModule {}