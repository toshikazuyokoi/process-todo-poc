import { Test, TestingModule } from '@nestjs/testing';
import { AIAgentController } from './ai-agent.controller';
import { StartInterviewSessionUseCase } from '../../application/usecases/ai-agent/start-interview-session.usecase';
import { GetInterviewSessionUseCase } from '../../application/usecases/ai-agent/get-interview-session.usecase';
import { EndInterviewSessionUseCase } from '../../application/usecases/ai-agent/end-interview-session.usecase';
import { ProcessUserMessageUseCase } from '../../application/usecases/ai-agent/process-user-message.usecase';
import { GetConversationHistoryUseCase } from '../../application/usecases/ai-agent/get-conversation-history.usecase';
import { StartSessionDto } from '../../application/dto/ai-agent/start-session.dto';
import { SendMessageDto } from '../../application/dto/ai-agent/send-message.dto';
import { DomainException } from '../../domain/exceptions/domain.exception';
import { SessionStatus } from '../../domain/ai-agent/entities/interview-session.entity';
import { HttpStatus } from '@nestjs/common';

describe('AIAgentController', () => {
  let controller: AIAgentController;
  let startInterviewUseCase: jest.Mocked<StartInterviewSessionUseCase>;
  let getInterviewUseCase: jest.Mocked<GetInterviewSessionUseCase>;
  let endInterviewUseCase: jest.Mocked<EndInterviewSessionUseCase>;
  let processMessageUseCase: jest.Mocked<ProcessUserMessageUseCase>;
  let getConversationUseCase: jest.Mocked<GetConversationHistoryUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIAgentController],
      providers: [
        {
          provide: StartInterviewSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetInterviewSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: EndInterviewSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ProcessUserMessageUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetConversationHistoryUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AIAgentController>(AIAgentController);
    startInterviewUseCase = module.get(StartInterviewSessionUseCase);
    getInterviewUseCase = module.get(GetInterviewSessionUseCase);
    endInterviewUseCase = module.get(EndInterviewSessionUseCase);
    processMessageUseCase = module.get(ProcessUserMessageUseCase);
    getConversationUseCase = module.get(GetConversationHistoryUseCase);
  });

  describe('POST /sessions - Start Session', () => {
    const mockRequest = { user: { id: 1 } };
    const createDto = (): StartSessionDto => {
      const dto = new StartSessionDto();
      dto.industry = 'ソフトウェア開発';
      dto.processType = 'アジャイル開発';
      dto.goal = 'プロセス改善';
      return dto;
    };

    it('should create a new session successfully', async () => {
      // Arrange
      const dto = createDto();
      const mockResult = {
        sessionId: 'test-session-123',
        status: SessionStatus.ACTIVE,
        welcomeMessage: 'こんにちは！プロセス改善についてお聞きします。',
        suggestedQuestions: [
          '現在のプロセスの課題は何ですか？',
          'チームの規模を教えてください',
          '目標とする改善点は何ですか？',
        ],
        expiresAt: new Date('2024-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      startInterviewUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.startSession(mockRequest, dto);

      // Assert
      expect(result.sessionId).toBe(mockResult.sessionId);
      expect(result.status).toBe(mockResult.status);
      expect(result.context.industry).toBe(dto.industry);
      expect(result.context.processType).toBe(dto.processType);
      expect(result.context.goal).toBe(dto.goal);
      expect(result.conversation).toHaveLength(1);
      expect(result.conversation[0].role).toBe('assistant');
      expect(result.conversation[0].content).toBe(mockResult.welcomeMessage);
      expect(result.requirements).toEqual([]);
      expect(result.expiresAt).toEqual(mockResult.expiresAt);
    });

    it('should include additional context when provided', async () => {
      // Arrange
      const dto = createDto();
      dto.additionalContext = { teamSize: 10, note: '現在のチームサイズは10名です' };
      
      const mockResult = {
        sessionId: 'test-session-456',
        status: SessionStatus.ACTIVE,
        welcomeMessage: 'Welcome!',
        suggestedQuestions: [
          'What is your team size?',
          'What are your main challenges?',
        ],
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      startInterviewUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.startSession(mockRequest, dto);

      // Assert
      expect(result.context.additionalContext).toBe(dto.additionalContext);
      expect(startInterviewUseCase.execute).toHaveBeenCalledWith({
        userId: mockRequest.user.id,
        industry: dto.industry,
        processType: dto.processType,
        goal: dto.goal,
        additionalContext: dto.additionalContext,
      });
    });

    it('should handle rate limit error', async () => {
      // Arrange
      const dto = createDto();
      startInterviewUseCase.execute.mockRejectedValue(
        new DomainException('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED'),
      );

      // Act & Assert
      await expect(controller.startSession(mockRequest, dto))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle validation errors', async () => {
      // Arrange
      const dto = createDto();
      startInterviewUseCase.execute.mockRejectedValue(
        new DomainException('Industry is required'),
      );

      // Act & Assert
      await expect(controller.startSession(mockRequest, dto))
        .rejects.toThrow('Industry is required');
    });

    it('should pass correct user ID from request', async () => {
      // Arrange
      const dto = createDto();
      const customRequest = { user: { id: 999 } };
      const mockResult = {
        sessionId: 'test-session-999',
        status: SessionStatus.ACTIVE,
        welcomeMessage: 'Welcome!',
        suggestedQuestions: ['Question 1', 'Question 2'],
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      startInterviewUseCase.execute.mockResolvedValue(mockResult);

      // Act
      await controller.startSession(customRequest, dto);

      // Assert
      expect(startInterviewUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 999 }),
      );
    });
  });

  describe('GET /sessions/:sessionId - Get Session', () => {
    const mockRequest = { user: { id: 1 } };

    it('should retrieve session successfully', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      const mockResult = {
        sessionId,
        userId: 1,
        status: SessionStatus.ACTIVE,
        context: {
          industry: 'IT',
          processType: 'DevOps',
          goal: 'Automation',
        },
        conversation: [],
        requirements: [],
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getInterviewUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getSession(mockRequest, sessionId);

      // Assert
      expect(result).toEqual(mockResult);
      expect(getInterviewUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
      });
    });

    it('should handle session not found error', async () => {
      // Arrange
      const sessionId = 'non-existent';
      getInterviewUseCase.execute.mockRejectedValue(
        new DomainException('Session not found', 'SESSION_NOT_FOUND'),
      );

      // Act & Assert
      await expect(controller.getSession(mockRequest, sessionId))
        .rejects.toThrow('Session not found');
    });

    it('should handle access denied error', async () => {
      // Arrange
      const sessionId = 'other-user-session';
      getInterviewUseCase.execute.mockRejectedValue(
        new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
      );

      // Act & Assert
      await expect(controller.getSession(mockRequest, sessionId))
        .rejects.toThrow('Session not found or access denied');
    });

    it('should return session with conversation and requirements', async () => {
      // Arrange
      const sessionId = 'test-session-full';
      const mockResult = {
        sessionId,
        userId: 1,
        status: SessionStatus.ACTIVE,
        context: { industry: 'Manufacturing', processType: 'QA', goal: 'Quality' },
        conversation: [
          { role: 'assistant' as const, content: 'Hello', timestamp: new Date() },
          { role: 'user' as const, content: 'Hi', timestamp: new Date() },
        ],
        requirements: [
          { category: 'Functional', description: 'Requirement 1', priority: 'high' as const, confidence: 0.85 },
        ],
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getInterviewUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getSession(mockRequest, sessionId);

      // Assert
      expect(result.conversation).toHaveLength(2);
      expect(result.requirements).toHaveLength(1);
    });
  });

  describe('DELETE /sessions/:sessionId - End Session', () => {
    const mockRequest = { user: { id: 1 } };

    it('should end session successfully', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      endInterviewUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.endSession(mockRequest, sessionId);

      // Assert
      expect(result).toBeUndefined();
      expect(endInterviewUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
      });
    });

    it('should handle session not found error', async () => {
      // Arrange
      const sessionId = 'non-existent';
      endInterviewUseCase.execute.mockRejectedValue(
        new DomainException('Session not found', 'SESSION_NOT_FOUND'),
      );

      // Act & Assert
      await expect(controller.endSession(mockRequest, sessionId))
        .rejects.toThrow('Session not found');
    });

    it('should handle already completed session', async () => {
      // Arrange
      const sessionId = 'completed-session';
      endInterviewUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.endSession(mockRequest, sessionId);

      // Assert
      expect(result).toBeUndefined();
      // The use case handles the logic of whether to actually end the session
    });

    it('should pass correct parameters to use case', async () => {
      // Arrange
      const sessionId = 'test-session-xyz';
      const customRequest = { user: { id: 42 } };
      endInterviewUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.endSession(customRequest, sessionId);

      // Assert
      expect(endInterviewUseCase.execute).toHaveBeenCalledWith({
        sessionId: 'test-session-xyz',
        userId: 42,
      });
    });
  });

  describe('POST /sessions/:sessionId/messages - Send Message', () => {
    const mockRequest = { user: { id: 1 } };
    const createMessageDto = (): SendMessageDto => {
      const dto = new SendMessageDto();
      dto.message = 'これはテストメッセージです';
      return dto;
    };

    it('should process message successfully', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      const dto = createMessageDto();
      const mockResult = {
        sessionId,
        userMessage: {
          content: dto.message,
          timestamp: new Date(),
        },
        aiResponse: {
          content: 'AIからの応答です',
          timestamp: new Date(),
        },
        extractedRequirements: [],
        conversationProgress: {
          totalMessages: 3,
          requirementsExtracted: 0,
          completeness: 30,
        },
      };

      processMessageUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.sendMessage(mockRequest, sessionId, dto);

      // Assert
      expect(result.sessionId).toBe(sessionId);
      expect(result.userMessage).toEqual(mockResult.userMessage);
      expect(result.aiResponse).toEqual(mockResult.aiResponse);
      expect(result.extractedRequirements).toEqual([]);
      expect(result.conversationProgress).toEqual(mockResult.conversationProgress);
      expect(result.usage).toBeDefined();
    });

    it('should include metadata when provided', async () => {
      // Arrange
      const sessionId = 'test-session-456';
      const dto = createMessageDto();
      dto.metadata = { source: 'web', version: '1.0' };
      
      const mockResult = {
        sessionId,
        userMessage: { content: dto.message, timestamp: new Date() },
        aiResponse: { content: 'Response', timestamp: new Date() },
        extractedRequirements: [],
        conversationProgress: { totalMessages: 1, requirementsExtracted: 0, completeness: 10 },
      };

      processMessageUseCase.execute.mockResolvedValue(mockResult);

      // Act
      await controller.sendMessage(mockRequest, sessionId, dto);

      // Assert
      expect(processMessageUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
        message: dto.message,
        metadata: dto.metadata,
      });
    });

    it('should return extracted requirements when available', async () => {
      // Arrange
      const sessionId = 'test-session-789';
      const dto = createMessageDto();
      const mockResult = {
        sessionId,
        userMessage: { content: dto.message, timestamp: new Date() },
        aiResponse: { content: 'Requirements extracted', timestamp: new Date() },
        extractedRequirements: [
          { category: 'Functional', description: 'Login feature', priority: 'high', confidence: 0.9 },
          { category: 'Security', description: 'Encryption', priority: 'high', confidence: 0.85 },
        ],
        conversationProgress: { totalMessages: 5, requirementsExtracted: 2, completeness: 45 },
      };

      processMessageUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.sendMessage(mockRequest, sessionId, dto);

      // Assert
      expect(result.extractedRequirements).toHaveLength(2);
      expect(result.conversationProgress?.completeness).toBeDefined();
    });

    it('should handle session not found error', async () => {
      // Arrange
      const sessionId = 'non-existent';
      const dto = createMessageDto();
      processMessageUseCase.execute.mockRejectedValue(
        new DomainException('Session not found', 'SESSION_NOT_FOUND'),
      );

      // Act & Assert
      await expect(controller.sendMessage(mockRequest, sessionId, dto))
        .rejects.toThrow('Session not found');
    });

    it('should handle rate limit error', async () => {
      // Arrange
      const sessionId = 'test-session';
      const dto = createMessageDto();
      processMessageUseCase.execute.mockRejectedValue(
        new DomainException('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED'),
      );

      // Act & Assert
      await expect(controller.sendMessage(mockRequest, sessionId, dto))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle expired session error', async () => {
      // Arrange
      const sessionId = 'expired-session';
      const dto = createMessageDto();
      processMessageUseCase.execute.mockRejectedValue(
        new DomainException('Session has expired', 'SESSION_EXPIRED'),
      );

      // Act & Assert
      await expect(controller.sendMessage(mockRequest, sessionId, dto))
        .rejects.toThrow('Session has expired');
    });

    it('should return usage information', async () => {
      // Arrange
      const sessionId = 'test-session';
      const dto = createMessageDto();
      const mockResult = {
        sessionId,
        userMessage: { content: dto.message, timestamp: new Date() },
        aiResponse: { content: 'Response', timestamp: new Date() },
        extractedRequirements: [],
        conversationProgress: { totalMessages: 1, requirementsExtracted: 0, completeness: 10 },
      };

      processMessageUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.sendMessage(mockRequest, sessionId, dto);

      // Assert
      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      });
    });
  });

  describe('GET /sessions/:sessionId/messages - Get Conversation History', () => {
    const mockRequest = { user: { id: 1 } };

    it('should retrieve conversation history successfully', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      const mockResult = {
        sessionId,
        messages: [
          { role: 'assistant' as const, content: 'Welcome!', timestamp: new Date() },
          { role: 'user' as const, content: 'Hello', timestamp: new Date() },
          { role: 'assistant' as const, content: 'How can I help?', timestamp: new Date() },
        ],
        totalMessages: 3,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        lastMessageAt: new Date('2024-01-01T00:10:00Z'),
      };

      getConversationUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getMessages(mockRequest, sessionId);

      // Assert
      expect(result).toEqual(mockResult);
      expect(result.messages).toHaveLength(3);
      expect(result.totalMessages).toBe(3);
      expect(getConversationUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
      });
    });

    it('should handle empty conversation history', async () => {
      // Arrange
      const sessionId = 'new-session';
      const mockResult = {
        sessionId,
        messages: [],
        totalMessages: 0,
        startedAt: new Date(),
        lastMessageAt: new Date(),
      };

      getConversationUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getMessages(mockRequest, sessionId);

      // Assert
      expect(result.messages).toEqual([]);
      expect(result.totalMessages).toBe(0);
    });

    it('should handle session not found error', async () => {
      // Arrange
      const sessionId = 'non-existent';
      getConversationUseCase.execute.mockRejectedValue(
        new DomainException('Session not found', 'SESSION_NOT_FOUND'),
      );

      // Act & Assert
      await expect(controller.getMessages(mockRequest, sessionId))
        .rejects.toThrow('Session not found');
    });

    it('should return messages with metadata', async () => {
      // Arrange
      const sessionId = 'test-session-metadata';
      const mockResult = {
        sessionId,
        messages: [
          {
            role: 'assistant' as const,
            content: 'AI response',
            timestamp: new Date(),
            metadata: { model: 'gpt-4', confidence: 0.95 },
          },
        ],
        totalMessages: 1,
        startedAt: new Date(),
        lastMessageAt: new Date(),
      };

      getConversationUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getMessages(mockRequest, sessionId);

      // Assert
      expect(result.messages[0].metadata).toBeDefined();
      expect(result.messages[0].metadata?.model).toBe('gpt-4');
      expect(result.messages[0].metadata?.confidence).toBe(0.95);
    });

    it('should pass correct user ID from request', async () => {
      // Arrange
      const sessionId = 'test-session';
      const customRequest = { user: { id: 999 } };
      const mockResult = {
        sessionId,
        messages: [],
        totalMessages: 0,
        startedAt: new Date(),
        lastMessageAt: new Date(),
      };

      getConversationUseCase.execute.mockResolvedValue(mockResult);

      // Act
      await controller.getMessages(customRequest, sessionId);

      // Assert
      expect(getConversationUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: 999,
      });
    });
  });

  describe('Error handling', () => {
    const mockRequest = { user: { id: 1 } };

    it('should propagate unexpected errors', async () => {
      // Arrange
      const sessionId = 'test-session';
      const unexpectedError = new Error('Unexpected database error');
      getInterviewUseCase.execute.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(controller.getSession(mockRequest, sessionId))
        .rejects.toThrow('Unexpected database error');
    });

    it('should handle missing user in request', async () => {
      // Arrange
      const invalidRequest = {};
      const dto = new StartSessionDto();
      dto.industry = 'IT';
      dto.processType = 'DevOps';
      dto.goal = 'Automation';

      // Act & Assert
      await expect(controller.startSession(invalidRequest as any, dto))
        .rejects.toThrow();
    });

    it('should handle malformed session ID', async () => {
      // Arrange
      const malformedSessionId = ''; // Empty string
      getInterviewUseCase.execute.mockRejectedValue(
        new DomainException('Session ID is required'),
      );

      // Act & Assert
      await expect(controller.getSession(mockRequest, malformedSessionId))
        .rejects.toThrow('Session ID is required');
    });
  });

  describe('Integration scenarios', () => {
    const mockRequest = { user: { id: 1 } };

    it('should handle complete session lifecycle', async () => {
      // Arrange
      const sessionId = 'lifecycle-test';
      
      // Start session
      const startResult = {
        sessionId,
        status: SessionStatus.ACTIVE,
        welcomeMessage: 'Welcome!',
        suggestedQuestions: ['What is your team size?', 'What is your timeline?'],
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      startInterviewUseCase.execute.mockResolvedValue(startResult);

      // Get session
      const getResult = {
        sessionId,
        userId: 1,
        status: SessionStatus.ACTIVE,
        context: { industry: 'IT', processType: 'DevOps', goal: 'Automation' },
        conversation: [],
        requirements: [],
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      getInterviewUseCase.execute.mockResolvedValue(getResult);

      // Send message
      const messageResult = {
        sessionId,
        userMessage: { content: 'Test', timestamp: new Date() },
        aiResponse: { content: 'Response', timestamp: new Date() },
        extractedRequirements: [],
        conversationProgress: { totalMessages: 2, requirementsExtracted: 0, completeness: 20 },
      };
      processMessageUseCase.execute.mockResolvedValue(messageResult);

      // End session
      endInterviewUseCase.execute.mockResolvedValue(undefined);

      // Act
      const dto = new StartSessionDto();
      dto.industry = 'IT';
      dto.processType = 'DevOps';
      dto.goal = 'Automation';
      
      const session = await controller.startSession(mockRequest, dto);
      expect(session.sessionId).toBe(sessionId);

      const retrieved = await controller.getSession(mockRequest, sessionId);
      expect(retrieved.sessionId).toBe(sessionId);

      const messageDto = new SendMessageDto();
      messageDto.message = 'Test';
      const messageResponse = await controller.sendMessage(mockRequest, sessionId, messageDto);
      expect(messageResponse.sessionId).toBe(sessionId);

      const endResult = await controller.endSession(mockRequest, sessionId);
      expect(endResult).toBeUndefined();
    });

    it('should handle concurrent requests for same session', async () => {
      // Arrange
      const sessionId = 'concurrent-test';
      const messageDto = new SendMessageDto();
      messageDto.message = 'Concurrent message';

      const messageResult = {
        sessionId,
        userMessage: { content: messageDto.message, timestamp: new Date() },
        aiResponse: { content: 'Response', timestamp: new Date() },
        extractedRequirements: [],
        conversationProgress: { totalMessages: 1, requirementsExtracted: 0, completeness: 10 },
      };

      processMessageUseCase.execute.mockResolvedValue(messageResult);

      // Act - Simulate concurrent requests
      const promises = [
        controller.sendMessage(mockRequest, sessionId, messageDto),
        controller.sendMessage(mockRequest, sessionId, messageDto),
        controller.sendMessage(mockRequest, sessionId, messageDto),
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(processMessageUseCase.execute).toHaveBeenCalledTimes(3);
    });
  });
});