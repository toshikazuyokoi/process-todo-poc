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
import { DomainException } from '../../../domain/exceptions/domain.exception';

class FakeMsg {
  constructor(private role: any, private content: any) {}
  getRole() { return this.role; }
  getContent() { return this.content; }
  getContentText() { return typeof this.content === 'string' ? this.content : JSON.stringify(this.content); }
  getTimestamp() { return new Date(); }
}

class FakeSession {
  private conversation: any[] = [];
  constructor(private id: string, private userId: number, private status: any, private ctx: any) {}
  getSessionIdString() { return this.id; }
  getUserId() { return this.userId; }
  getStatus() { return this.status; }
  isExpired() { return false; }
  getConversation() { return this.conversation; }
  getContext() { return this.ctx; }
  getExtractedRequirements() { return []; }
  addMessage(m: any) { this.conversation.push(m); }
}

describe('ProcessUserMessageUseCase (Phase1 behavior)', () => {
  let useCase: ProcessUserMessageUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let responder: jest.Mocked<AIConversationResponder>;
  let analysis: jest.Mocked<ProcessAnalysisService>;
  let rate: jest.Mocked<AIRateLimitService>;
  let mon: jest.Mocked<AIMonitoringService>;
  let queue: jest.Mocked<BackgroundJobQueueInterface>;
  let socket: jest.Mocked<SocketGateway>;
  let cache: jest.Mocked<AICacheService>;
  let audit: jest.Mocked<AIAuditService>;
  let parser: jest.Mocked<LLMOutputParser>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessUserMessageUseCase,
        { provide: 'InterviewSessionRepository', useValue: { findById: jest.fn(), updateConversation: jest.fn() } },
        { provide: AI_CONVERSATION_RESPONDER, useValue: { processMessage: jest.fn() } },
        { provide: ProcessAnalysisService, useValue: { calculateConversationProgress: jest.fn() } },
        { provide: AIRateLimitService, useValue: { checkRateLimit: jest.fn().mockResolvedValue(true) } },
        { provide: AIMonitoringService, useValue: { logUsage: jest.fn(), logAIRequest: jest.fn(), logAIError: jest.fn() } },
        { provide: 'BackgroundJobQueue', useValue: { addJob: jest.fn().mockResolvedValue(undefined) } },
        { provide: SocketGateway, useValue: { broadcastConversationUpdate: jest.fn() } },
        { provide: AICacheService, useValue: { cacheConversation: jest.fn().mockResolvedValue(undefined) } },
        { provide: AIAuditService, useValue: { computeConversationHash: jest.fn().mockReturnValue('hash') } },
        { provide: LLMOutputParser, useValue: { extractTemplateJson: jest.fn().mockReturnValue({ ok: true }) } },
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
  });

  it('happy path reflects tokenCount and Japanese fallback on failures', async () => {
    const session = new FakeSession('s', 1, 'active', {});
    (sessionRepository.findById as jest.Mock).mockResolvedValue(session);

    (responder.processMessage as jest.Mock).mockResolvedValue({ response: 'ai-content', tokenCount: 7, requirementsExtracted: false });
    ;(analysis.calculateConversationProgress as jest.Mock).mockResolvedValue({ completion: 0.4 });

    const out = await useCase.execute({ sessionId: 's', userId: 1, message: 'Hi' } as any);

    expect(mon.logUsage).toHaveBeenCalledWith(1, 7, 0);
    expect(out.aiResponse.content).toBe('ai-content');

    // Force failure path and ensure Japanese fallback
    (responder.processMessage as jest.Mock).mockRejectedValueOnce({ response: { status: 400 } });
    const out2 = await useCase.execute({ sessionId: 's', userId: 1, message: 'Hi' } as any);
    expect(out2.aiResponse.content).toContain('現在AI応答の生成で問題が発生しました');
    expect(out2.aiResponse.suggestedQuestions).toEqual([]);
  });

  it('logs parser success/failure and audit hash', async () => {
    const session = new FakeSession('s', 1, 'active', {});
    (sessionRepository.findById as jest.Mock).mockResolvedValue(session);

    // parser ok -> structured_json_ok
    ;(responder.processMessage as jest.Mock).mockResolvedValueOnce({ response: 'ai-content', tokenCount: 3, requirementsExtracted: false });
    await useCase.execute({ sessionId: 's', userId: 1, message: 'Hi' } as any);
    expect(mon.logAIRequest).toHaveBeenCalledWith(1, 'structured_json_ok', 3, 0);

    // parser ng -> logAIError
    ;(parser.extractTemplateJson as jest.Mock).mockReturnValueOnce({ ok: false, errors: ['Bad'] });
    ;(responder.processMessage as jest.Mock).mockResolvedValueOnce({ response: 'ai-content2', tokenCount: 4, requirementsExtracted: false });
    await useCase.execute({ sessionId: 's', userId: 1, message: 'Hi' } as any);
    expect(mon.logAIError).toHaveBeenCalledWith(1, 'parse_structured_json', expect.any(Error));

    // audit hash logging when non-null
    expect(mon.logAIRequest).toHaveBeenCalledWith(1, 'audit_hash', 0, 0);
  });

  it('retries on retryable errors then falls back after retry failure', async () => {
    const session = new FakeSession('s', 1, 'active', {});
    (sessionRepository.findById as jest.Mock).mockResolvedValue(session);

    // first: 429 -> retry
    ;(responder.processMessage as jest.Mock).mockRejectedValueOnce({ response: { status: 429 } });
    // retry fails
    ;(responder.processMessage as jest.Mock).mockRejectedValueOnce(new Error('failed'));

    jest.spyOn<any, any>(useCase as any, 'waitForRetry').mockResolvedValue(undefined);

    const out = await useCase.execute({ sessionId: 's', userId: 1, message: 'Hi' } as any);
    expect(out.aiResponse.content).toContain('現在AI応答の生成で問題が発生しました');
  });

  it('throws DomainException for invalid inputs and sessions', async () => {
    await expect(useCase.execute({} as any)).rejects.toThrow(DomainException);

    const session = new FakeSession('s', 2, 'active', {});
    (sessionRepository.findById as jest.Mock).mockResolvedValue(session);
    await expect(useCase.execute({ sessionId: 's', userId: 1, message: 'Hi' } as any)).rejects.toThrow(DomainException);
  });
});

