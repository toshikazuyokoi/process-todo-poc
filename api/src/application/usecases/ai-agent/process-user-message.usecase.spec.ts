import { Test, TestingModule } from '@nestjs/testing';
import { ProcessUserMessageUseCase } from './process-user-message.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AI_CONVERSATION_RESPONDER, AIConversationResponder } from '../../interfaces/ai-agent/ai-conversation-responder.interface';
import { ProcessAnalysisService } from '../../../domain/ai-agent/services/process-analysis.service';
import { AIRateLimitService } from '../../../infrastructure/ai/ai-rate-limit.service';
import { AIMonitoringService } from '../../../infrastructure/monitoring/ai-monitoring.service';
import { AIAuditService } from '../../../infrastructure/monitoring/ai-audit.service';
import { BackgroundJobQueueInterface, JobType } from '../../../infrastructure/queue/background-job-queue.interface';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';
import { LLMOutputParser } from '../../services/ai-agent/llm-output-parser.service';
import { TemplateDraftMapper } from '../../services/ai-agent/template-draft-mapper.service';
import { FeatureFlagService } from '../../../infrastructure/security/ai-feature-flag.guard';


describe('ProcessUserMessageUseCase', () => {
  let useCase: ProcessUserMessageUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let conversationService: jest.Mocked<AIConversationResponder>;
  let analysisService: jest.Mocked<ProcessAnalysisService>;
  let rateLimitService: jest.Mocked<AIRateLimitService>;
  let monitoringService: jest.Mocked<AIMonitoringService>;
  let backgroundJobQueue: jest.Mocked<BackgroundJobQueueInterface>;
  let socketGateway: jest.Mocked<SocketGateway>;
  let cacheService: jest.Mocked<AICacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessUserMessageUseCase,
        {
          provide: 'InterviewSessionRepository',
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findActiveByUserId: jest.fn(),
            findExpiredSessions: jest.fn(),
            updateConversation: jest.fn(),
            updateRequirements: jest.fn(),
            updateGeneratedTemplate: jest.fn(),
            markAsCompleted: jest.fn(),
            markAsExpired: jest.fn(),
            delete: jest.fn(),
            deleteExpiredSessions: jest.fn(),
          },
        },
        {
          provide: AI_CONVERSATION_RESPONDER,
          useValue: {
            processMessage: jest.fn(),
          },
        },
        {
          provide: ProcessAnalysisService,
          useValue: {
            extractRequirements: jest.fn(),
            calculateConversationProgress: jest.fn(),
            analyzeRequirements: jest.fn(),
            identifyStakeholders: jest.fn(),
            identifyDeliverables: jest.fn(),
            identifyConstraints: jest.fn(),
            estimateComplexity: jest.fn(),
            categorizeProcess: jest.fn(),
          },
        },
        {
          provide: AIRateLimitService,
          useValue: {
            checkRateLimit: jest.fn(),
            incrementCounter: jest.fn(),
          },
        },
        {
          provide: AIMonitoringService,
          useValue: {
            logAIRequest: jest.fn().mockResolvedValue(undefined),
            logAIError: jest.fn(),
            recordMetric: jest.fn(),
            logUsage: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: 'BackgroundJobQueue',
          useValue: {
            addJob: jest.fn(),
            process: jest.fn(),
            getJob: jest.fn(),
          },
        },
        {
          provide: SocketGateway,
          useValue: {
            notifySessionStatusChanged: jest.fn(),
            broadcastConversationUpdate: jest.fn(),
            notifyRequirementsExtracted: jest.fn(),
            notifyError: jest.fn(),
          },
        },
        {
          provide: AICacheService,
          useValue: {
            cacheConversation: jest.fn(),
            getCachedConversation: jest.fn(),
            cacheSession: jest.fn(),
            getCachedSession: jest.fn(),
            clearSessionCache: jest.fn(),
          },
        },
        {
          provide: AIAuditService,
          useValue: {
            computeConversationHash: jest.fn().mockReturnValue('hash'),
          },
        },
        {
          provide: TemplateDraftMapper,
          useValue: { toSessionDraft: jest.fn() },
        },
        {
          provide: FeatureFlagService,
          useValue: { isEnabled: jest.fn().mockReturnValue(false) },
        },
        LLMOutputParser,
      ],
    }).compile();

    useCase = module.get<ProcessUserMessageUseCase>(ProcessUserMessageUseCase);
    sessionRepository = module.get('InterviewSessionRepository');
    conversationService = module.get(AI_CONVERSATION_RESPONDER);
    analysisService = module.get(ProcessAnalysisService);
    rateLimitService = module.get(AIRateLimitService);
    monitoringService = module.get(AIMonitoringService);
    backgroundJobQueue = module.get('BackgroundJobQueue');
    socketGateway = module.get(SocketGateway);
    cacheService = module.get(AICacheService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should process user message successfully', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();
        const mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
        });
        const mockAIResponse = TestDataFactory.createMockAIResponse();
        const mockProgress = {
          completeness: 45,
          missingAreas: ['timeline', 'budget'],
        };

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);
        conversationService.processMessage.mockResolvedValue({
          response: mockAIResponse.content,
          requirementsExtracted: false,
          extractedRequirements: [],
        });
        analysisService.calculateConversationProgress.mockResolvedValue(mockProgress);
        sessionRepository.updateConversation.mockResolvedValue(undefined);
        backgroundJobQueue.addJob.mockResolvedValue({ id: 'job-123' } as any);
        cacheService.cacheConversation.mockResolvedValue(undefined);
        // monitoringService.logUsage is now defined in the mock

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toBeDefined();
        expect(result.sessionId).toBe(input.sessionId);
        expect(result.userMessage.content).toBe(input.message);
        expect(result.aiResponse.content).toBe(mockAIResponse.content);
        expect(result.aiResponse.suggestedQuestions).toEqual([]); // Implementation always returns empty array
        expect(result.conversationProgress).toEqual(mockProgress);

        // Verify interactions
        expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
          input.userId,
          100,
        );
        expect(sessionRepository.findById).toHaveBeenCalledWith(input.sessionId);
        expect(conversationService.processMessage).toHaveBeenCalled();
        expect(backgroundJobQueue.addJob).toHaveBeenCalledWith({
          type: JobType.REQUIREMENT_ANALYSIS,
          userId: input.userId,
          sessionId: input.sessionId,
          payload: expect.objectContaining({
            sessionId: input.sessionId,
          }),
        });
        expect(socketGateway.broadcastConversationUpdate).toHaveBeenCalled();
        expect(monitoringService.logUsage).toHaveBeenCalledWith(
          input.userId,
          100,  // 実装でハードコードされた値
          0.001,  // 実装でハードコードされた値
        );
      });

      it('should extract requirements asynchronously', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();
        const mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
        });
        const mockAIResponse = TestDataFactory.createMockAIResponse();

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);
        conversationService.processMessage.mockResolvedValue({
          response: mockAIResponse.content,
          requirementsExtracted: false,
          extractedRequirements: [],
        });
        analysisService.calculateConversationProgress.mockResolvedValue({
          completeness: 50,
          missingAreas: [],
        });
        backgroundJobQueue.addJob.mockResolvedValue({ id: 'job-456' } as any);

        // Act
        await useCase.execute(input);

        // Assert
        expect(backgroundJobQueue.addJob).toHaveBeenCalledWith({
          type: JobType.REQUIREMENT_ANALYSIS,
          userId: input.userId,
          sessionId: input.sessionId,
          payload: expect.objectContaining({
            sessionId: input.sessionId,
            conversation: expect.any(Array),
            context: expect.any(Object),
          }),
        });
      });

      it('should calculate conversation progress', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();
        const mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
          conversation: [
            TestDataFactory.createMockConversationMessageEntity('assistant', 'Welcome'),
            TestDataFactory.createMockConversationMessageEntity('user', 'I need help'),
          ],
        });
        const mockAIResponse = TestDataFactory.createMockAIResponse();
        const mockProgress = {
          completeness: 75,
          missingAreas: ['compliance'],
        };

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);
        conversationService.processMessage.mockResolvedValue({
          response: mockAIResponse.content,
          requirementsExtracted: false,
          extractedRequirements: [],
        });
        analysisService.calculateConversationProgress.mockResolvedValue(mockProgress);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.conversationProgress).toEqual(mockProgress);
        expect(analysisService.calculateConversationProgress).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(Object),
        );
      });
    });

    describe('異常系', () => {
      it('should throw error when session not found', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Session not found', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when user does not own session', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput({ userId: 1 });
        const mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: 999,
        });

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when session is not active', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();
        const completedSession = TestDataFactory.createCompletedSession(input.userId);

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(completedSession);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException(
            'Session is completed. Only active sessions can receive messages.',
            'SESSION_INACTIVE',
          ),
        );
      });

      it('should throw error when session is expired', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();
        const expiredSession = TestDataFactory.createExpiredSession(input.userId);

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(expiredSession);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Session is expired. Only active sessions can receive messages.', 'SESSION_EXPIRED'),
        );
      });

      it('should throw error when message is empty', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput({ message: '' });

        // Setup session mock so we get to validation
        const mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
        });
        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Message is required'),
        );
      });

      it('should throw error when message exceeds 2000 characters', async () => {
        // Arrange
        const longMessage = 'a'.repeat(2001);
        const input = TestDataFactory.createMockProcessMessageInput({ message: longMessage });

        // Setup session mock so we get to validation
        const mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
        });
        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Message must be less than 2000 characters'),
        );
      });

      it('should throw error when rate limit exceeded', async () => {
        // Arrange
        const input = TestDataFactory.createMockProcessMessageInput();

        rateLimitService.checkRateLimit.mockResolvedValue(false);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException(
            'Rate limit exceeded. Maximum 100 messages per hour.',
            'RATE_LIMIT_EXCEEDED',
          ),
        );
      });
    });

    describe('OpenAI error handling', () => {
      let input: any;
      let mockSession: any;

      beforeEach(() => {
        input = TestDataFactory.createMockProcessMessageInput();
        mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
        });

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);
        analysisService.calculateConversationProgress.mockResolvedValue({
          completeness: 50,
          missingAreas: [],
        });
      });

      it('should retry on rate limit error (429)', async () => {
        // Arrange
        const rateLimitError = new Error('Rate limit exceeded') as any;
        rateLimitError.response = { status: 429 };

        const mockAIResponse = TestDataFactory.createMockAIResponse();

        conversationService.processMessage
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce({
            response: mockAIResponse.content,
            requirementsExtracted: false,
            extractedRequirements: [],
          });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toBe(mockAIResponse.content);
        expect(conversationService.processMessage).toHaveBeenCalledTimes(2);
      });

      it('should retry on service unavailable (503)', async () => {
        // Arrange
        const serviceError = new Error('Service unavailable') as any;
        serviceError.response = { status: 503 };

        const mockAIResponse = TestDataFactory.createMockAIResponse();

        conversationService.processMessage
          .mockRejectedValueOnce(serviceError)
          .mockResolvedValueOnce({
            response: mockAIResponse.content,
            requirementsExtracted: false,
            extractedRequirements: [],
          });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toBe(mockAIResponse.content);
        expect(conversationService.processMessage).toHaveBeenCalledTimes(2);
      });

      it('should retry on timeout error', async () => {
        // Arrange
        const timeoutError = new Error('Timeout') as any;
        timeoutError.code = 'ETIMEDOUT';

        const mockAIResponse = TestDataFactory.createMockAIResponse();

        conversationService.processMessage
          .mockRejectedValueOnce(timeoutError)
          .mockResolvedValueOnce({
            response: mockAIResponse.content,
            requirementsExtracted: false,
            extractedRequirements: [],
          });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toBe(mockAIResponse.content);
        expect(conversationService.processMessage).toHaveBeenCalledTimes(2);
      });

      it('should return fallback response on non-retryable error', async () => {
        // Arrange
        const authError = new Error('Unauthorized') as any;
        authError.response = { status: 401 };

        conversationService.processMessage.mockRejectedValue(authError);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toContain("I apologize, but I'm experiencing technical difficulties");
        expect(result.aiResponse.suggestedQuestions).toHaveLength(3);
        expect(result.aiResponse.confidence).toBe(0);
        expect(conversationService.processMessage).toHaveBeenCalledTimes(1);
      });

      it('should return fallback response after retry failures', async () => {
        // Arrange
        const rateLimitError = new Error('Rate limit exceeded') as any;
        rateLimitError.response = { status: 429 };

        conversationService.processMessage.mockRejectedValue(rateLimitError);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toContain("I apologize, but I'm experiencing technical difficulties");
        expect(conversationService.processMessage).toHaveBeenCalledTimes(2); // Initial + 1 retry
      });

      it('should handle 400 bad request without retry', async () => {
        // Arrange
        const badRequestError = new Error('Bad request') as any;
        badRequestError.response = { status: 400 };

        conversationService.processMessage.mockRejectedValue(badRequestError);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toContain("I apologize, but I'm experiencing technical difficulties");
        expect(conversationService.processMessage).toHaveBeenCalledTimes(1); // No retry
      });

      it('should handle 402 payment required without retry', async () => {
        // Arrange
        const paymentError = new Error('Payment required') as any;
        paymentError.response = { status: 402 };

        conversationService.processMessage.mockRejectedValue(paymentError);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.aiResponse.content).toContain("I apologize, but I'm experiencing technical difficulties");
        expect(conversationService.processMessage).toHaveBeenCalledTimes(1); // No retry
      });
    });

    describe('Side effects', () => {
      let input: any;
      let mockSession: any;
      let mockAIResponse: any;

      beforeEach(() => {
        input = TestDataFactory.createMockProcessMessageInput();
        mockSession = TestDataFactory.createMockSession({
          sessionId: input.sessionId,
          userId: input.userId,
        });
        mockAIResponse = TestDataFactory.createMockAIResponse();

        rateLimitService.checkRateLimit.mockResolvedValue(true);
        sessionRepository.findById.mockResolvedValue(mockSession);
        conversationService.processMessage.mockResolvedValue({
          response: mockAIResponse.content,
          requirementsExtracted: false,
          extractedRequirements: [],
        });
        analysisService.calculateConversationProgress.mockResolvedValue({
          completeness: 50,
          missingAreas: [],
        });
      });

      it('should update conversation in repository', async () => {
        // Act
        await useCase.execute(input);

        // Assert
        expect(sessionRepository.updateConversation).toHaveBeenCalled();
        const [sessionId, conversation] = sessionRepository.updateConversation.mock.calls[0];

        expect(sessionId).toBe(input.sessionId);
        expect(conversation).toHaveLength(2);

        // ConversationMessageエンティティのメソッドを使用して検証
        expect(conversation[0].getRole()).toBe('user');
        expect(conversation[0].getContentText()).toBe('Test user message');
        expect(conversation[1].getRole()).toBe('assistant');
        expect(conversation[1].getContentText()).toBe('This is an AI response');
      });

      it('should cache updated conversation', async () => {
        // Act
        await useCase.execute(input);

        // Assert
        expect(cacheService.cacheConversation).toHaveBeenCalledWith(
          input.sessionId,
          expect.any(Array),
        );
      });

      it('should broadcast conversation update via WebSocket', async () => {
        // Act
        await useCase.execute(input);

        // Assert
        expect(socketGateway.broadcastConversationUpdate).toHaveBeenCalledWith(
          input.sessionId,
          expect.objectContaining({
            message: expect.objectContaining({ role: 'user', content: input.message }),
            response: expect.objectContaining({ role: 'assistant', content: mockAIResponse.content }),
            timestamp: expect.any(Date),
          }),
        );
      });

      it('should log usage metrics', async () => {
        // Act
        await useCase.execute(input);

        // Assert
        expect(monitoringService.logUsage).toHaveBeenCalledWith(
          input.userId,
          100,  // 実装でハードコードされた値
          0.001,  // 実装でハードコードされた値
        );
      });
    });
  });
});