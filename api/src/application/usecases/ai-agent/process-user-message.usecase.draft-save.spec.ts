import { Test, TestingModule } from '@nestjs/testing';
import { ProcessUserMessageUseCase } from './process-user-message.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AI_CONVERSATION_RESPONDER, AIConversationResponder } from '../../interfaces/ai-agent/ai-conversation-responder.interface';
import { ProcessAnalysisService } from '../../../domain/ai-agent/services/process-analysis.service';
import { AIRateLimitService } from '../../../infrastructure/ai/ai-rate-limit.service';
import { AIMonitoringService } from '../../../infrastructure/monitoring/ai-monitoring.service';
import { BackgroundJobQueueInterface, JobType } from '../../../infrastructure/queue/background-job-queue.interface';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { AIAuditService } from '../../../infrastructure/monitoring/ai-audit.service';
import { LLMOutputParser } from '../../services/ai-agent/llm-output-parser.service';
import { TemplateDraftMapper } from '../../services/ai-agent/template-draft-mapper.service';
import { FeatureFlagService } from '../../../infrastructure/security/ai-feature-flag.guard';

class FakeSession {
  private conversation: any[] = [];
  constructor(private id: string, private userId: number) {}
  getSessionIdString() { return this.id; }
  getUserId() { return this.userId; }
  getStatus() { return 'active'; }
  isExpired() { return false; }
  getConversation() { return this.conversation; }
  getContext() { return {}; }
  getExtractedRequirements() { return []; }
  addMessage(m: any) { this.conversation.push(m); }
}

describe('ProcessUserMessageUseCase – Draft Save (PR2)', () => {
  let useCase: ProcessUserMessageUseCase;
  let sessionRepository: any;
  let responder: any;
  let analysis: any;
  let rate: any;
  let mon: any;
  let queue: any;
  let socket: any;
  let cache: any;
  let audit: any;
  let parser: any;
  let mapper: any;
  let flags: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessUserMessageUseCase,
        { provide: 'InterviewSessionRepository', useValue: { findById: jest.fn(), updateConversation: jest.fn(), updateGeneratedTemplate: jest.fn() } },
        { provide: AI_CONVERSATION_RESPONDER, useValue: { processMessage: jest.fn() } },
        { provide: ProcessAnalysisService, useValue: { calculateConversationProgress: jest.fn() } },
        { provide: AIRateLimitService, useValue: { checkRateLimit: jest.fn().mockResolvedValue(true) } },
        { provide: AIMonitoringService, useValue: { logUsage: jest.fn(), logAIRequest: jest.fn(), logAIError: jest.fn() } },
        { provide: 'BackgroundJobQueue', useValue: { addJob: jest.fn().mockResolvedValue(undefined) } },
        { provide: SocketGateway, useValue: { broadcastConversationUpdate: jest.fn(), notifyTemplateGenerated: jest.fn() } },
        { provide: AICacheService, useValue: { cacheConversation: jest.fn().mockResolvedValue(undefined) } },
        { provide: AIAuditService, useValue: { computeConversationHash: jest.fn().mockReturnValue('hash') } },
        { provide: LLMOutputParser, useValue: { extractTemplateJson: jest.fn() } },
        { provide: TemplateDraftMapper, useValue: { toSessionDraft: jest.fn() } },
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(ProcessUserMessageUseCase);
    sessionRepository = module.get('InterviewSessionRepository');
    responder = module.get(AI_CONVERSATION_RESPONDER);
    analysis = module.get(ProcessAnalysisService);
    rate = module.get(AIRateLimitService);
    mon = module.get(AIMonitoringService);
    queue = module.get('BackgroundJobQueue');
    socket = module.get(SocketGateway);
    cache = module.get(AICacheService);
    audit = module.get(AIAuditService);
    parser = module.get(LLMOutputParser);
    mapper = module.get(TemplateDraftMapper);
    flags = module.get(FeatureFlagService);
  });

  it('saves draft and notifies when feature flag ON and parse OK', async () => {
    const session = new FakeSession('s1', 10);
    sessionRepository.findById.mockResolvedValue(session);
    responder.processMessage.mockResolvedValue({ response: 'hello```json\n{"schema":"ai_chat_process_template.v1","process_template_draft":{"name":"X","stepTemplates":[]}}\n```', tokenCount: 5 });
    parser.extractTemplateJson.mockReturnValue({ ok: true, data: { schema: 'ai_chat_process_template.v1', process_template_draft: { name: 'X', stepTemplates: [] } } });
    flags.isEnabled.mockReturnValue(true);
    mapper.toSessionDraft.mockReturnValue({ name: 'X', steps: [], metadata: { generatedAt: new Date().toISOString(), confidence: 0.8, sources: [] } });

    await useCase.execute({ sessionId: 's1', userId: 10, message: 'm' } as any);

    expect(sessionRepository.updateGeneratedTemplate).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'X' }));
    expect(socket.notifyTemplateGenerated).toHaveBeenCalled();
  });

  it('does not save when feature flag OFF', async () => {
    const session = new FakeSession('s2', 10);
    sessionRepository.findById.mockResolvedValue(session);
    responder.processMessage.mockResolvedValue({ response: 'text', tokenCount: 3 });
    parser.extractTemplateJson.mockReturnValue({ ok: true, data: { schema: 'ai_chat_process_template.v1', process_template_draft: { name: 'X', stepTemplates: [] } } });
    flags.isEnabled.mockReturnValue(false);

    await useCase.execute({ sessionId: 's2', userId: 10, message: 'm' } as any);

    expect(sessionRepository.updateGeneratedTemplate).not.toHaveBeenCalled();
    expect(socket.notifyTemplateGenerated).not.toHaveBeenCalled();
  });

  it('does not save when parse fails', async () => {
    const session = new FakeSession('s3', 10);
    sessionRepository.findById.mockResolvedValue(session);
    responder.processMessage.mockResolvedValue({ response: 'no-json', tokenCount: 3 });
    parser.extractTemplateJson.mockReturnValue({ ok: false, errors: ['MissingFence'] });
    flags.isEnabled.mockReturnValue(true);

    await useCase.execute({ sessionId: 's3', userId: 10, message: 'm' } as any);

    expect(sessionRepository.updateGeneratedTemplate).not.toHaveBeenCalled();
    expect(socket.notifyTemplateGenerated).not.toHaveBeenCalled();
  });

  it('swallows persistence errors and logs via monitoring', async () => {
    const session = new FakeSession('s4', 10);
    sessionRepository.findById.mockResolvedValue(session);
    responder.processMessage.mockResolvedValue({ response: 'ok', tokenCount: 3 });
    parser.extractTemplateJson.mockReturnValue({ ok: true, data: { schema: 'ai_chat_process_template.v1', process_template_draft: { name: 'X', stepTemplates: [] } } });
    flags.isEnabled.mockReturnValue(true);
    mapper.toSessionDraft.mockReturnValue({ name: 'X', steps: [], metadata: { generatedAt: new Date().toISOString(), confidence: 0.8, sources: [] } });
    sessionRepository.updateGeneratedTemplate.mockRejectedValue(new Error('db error'));

    await useCase.execute({ sessionId: 's4', userId: 10, message: 'm' } as any);

    expect(mon.logAIError).toHaveBeenCalledWith(10, 'draft_save_error', expect.any(Error));
  });
});

