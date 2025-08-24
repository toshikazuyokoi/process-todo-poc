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
import { DomainModule } from '../../../domain/domain.module';
import { InfrastructureModule } from '../../../infrastructure/infrastructure.module';
import { WebSocketModule } from '../../../infrastructure/websocket/websocket.module';
import { AICacheModule } from '../../../infrastructure/cache/cache.module';
import { MonitoringModule } from '../../../infrastructure/monitoring/monitoring.module';
import { QueueModule } from '../../../infrastructure/queue/queue.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DomainModule,
    InfrastructureModule,
    WebSocketModule,
    AICacheModule,
    MonitoringModule,
    QueueModule,
  ],
  controllers: [AIAgentController],
  providers: [
    StartInterviewSessionUseCase,
    GetInterviewSessionUseCase,
    EndInterviewSessionUseCase,
    ProcessUserMessageUseCase,
    GetConversationHistoryUseCase,
    CleanupExpiredSessionsUseCase,
    CollectUserFeedbackUseCase,
  ],
  exports: [
    StartInterviewSessionUseCase,
    GetInterviewSessionUseCase,
    EndInterviewSessionUseCase,
    ProcessUserMessageUseCase,
    GetConversationHistoryUseCase,
    CleanupExpiredSessionsUseCase,
    CollectUserFeedbackUseCase,
  ],
})
export class AIAgentModule {}