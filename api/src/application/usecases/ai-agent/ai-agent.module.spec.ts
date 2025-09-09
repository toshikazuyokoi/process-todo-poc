import { Test } from '@nestjs/testing';
import { AIAgentModule } from './ai-agent.module';
import { AI_CONVERSATION_RESPONDER, AIConversationResponder } from '../../interfaces/ai-agent/ai-conversation-responder.interface';
import { AIConversationService } from '../../../domain/ai-agent/services/ai-conversation.service';
import { OpenAIResponder } from '../../services/ai-agent/openai-responder.service';
import { ConfigModule } from '@nestjs/config';
import { MonitoringModule } from '../../../infrastructure/monitoring/monitoring.module';
import { InfrastructureModule } from '../../../infrastructure/infrastructure.module';
import { DomainModule } from '../../../domain/domain.module';
import { WebSocketModule } from '../../../infrastructure/websocket/websocket.module';
import { AICacheModule } from '../../../infrastructure/cache/cache.module';
import { QueueModule } from '../../../infrastructure/queue/queue.module';

// Helper to isolate env changes per test
const withEnv = async (key: string, value: string, fn: () => Promise<void>) => {
  const old = process.env[key];
  process.env[key] = value;
  try { await fn(); } finally { if (old === undefined) delete process.env[key]; else process.env[key] = old; }
};

describe('AIAgentModule DI', () => {
  it('binds AI_CONVERSATION_RESPONDER to AIConversationService when AI_AGENT_MODE=mock', async () => {
    await withEnv('AI_AGENT_MODE', 'mock', async () => {
      const moduleRef = await Test.createTestingModule({ imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // minimal deps so AIAgentModule compiles
        MonitoringModule,
        InfrastructureModule,
        DomainModule,
        WebSocketModule,
        AICacheModule,
        QueueModule,
        AIAgentModule,
      ], providers: [
        { provide: (await import('../../../infrastructure/monitoring/ai-audit.service')).AIAuditService, useValue: { computeConversationHash: jest.fn().mockReturnValue('hash') } },
        // Provide PromptBuilder/HistoryAssembler since OpenAIResponder is constructed
        (await import('../../services/ai-agent/prompt-builder.service')).PromptBuilder,
        (await import('../../services/ai-agent/history-assembler.service')).HistoryAssembler,
        (await import('../../services/ai-agent/openai-responder.service')).OpenAIResponder,
      ] }).compile();
      const impl = moduleRef.get<AIConversationResponder>(AI_CONVERSATION_RESPONDER, { strict: false } as any);
      // In mock mode we expect conversation service (domain mock)
      const isMock = impl instanceof AIConversationService;
      expect(isMock).toBe(true);
    });
  });

  it('binds AI_CONVERSATION_RESPONDER to OpenAIResponder when AI_AGENT_MODE=openai', async () => {
    await withEnv('AI_AGENT_MODE', 'openai', async () => {
      const moduleRef = await Test.createTestingModule({ imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MonitoringModule,
        InfrastructureModule,
        DomainModule,
        WebSocketModule,
        AICacheModule,
        QueueModule,
        AIAgentModule,
      ], providers: [
        { provide: (await import('../../../infrastructure/monitoring/ai-audit.service')).AIAuditService, useValue: { computeConversationHash: jest.fn().mockReturnValue('hash') } },
        (await import('../../services/ai-agent/prompt-builder.service')).PromptBuilder,
        (await import('../../services/ai-agent/history-assembler.service')).HistoryAssembler,
        (await import('../../services/ai-agent/openai-responder.service')).OpenAIResponder,
      ] }).compile();
      const impl = moduleRef.get<AIConversationResponder>(AI_CONVERSATION_RESPONDER, { strict: false } as any);
      const isOpenAI = impl instanceof OpenAIResponder;
      expect(isOpenAI).toBe(true);
    });
  });
});

