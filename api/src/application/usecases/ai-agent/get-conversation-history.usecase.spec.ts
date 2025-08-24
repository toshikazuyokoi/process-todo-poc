import { Test, TestingModule } from '@nestjs/testing';
import { GetConversationHistoryUseCase } from './get-conversation-history.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';

describe('GetConversationHistoryUseCase', () => {
  let useCase: GetConversationHistoryUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let cacheService: jest.Mocked<AICacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetConversationHistoryUseCase,
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
          provide: AICacheService,
          useValue: {
            cacheConversation: jest.fn(),
            getCachedConversation: jest.fn(),
            cacheSession: jest.fn(),
            getCachedSession: jest.fn(),
            clearSessionCache: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetConversationHistoryUseCase>(GetConversationHistoryUseCase);
    sessionRepository = module.get('InterviewSessionRepository');
    cacheService = module.get(AICacheService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should retrieve conversation history from cache when available', async () => {
        // Arrange
        const sessionId = 'test-session-123';
        const userId = 1;
        const cachedConversation = [
          TestDataFactory.createMockConversationMessage('assistant', 'Welcome!'),
          TestDataFactory.createMockConversationMessage('user', 'Hello'),
          TestDataFactory.createMockConversationMessage('assistant', 'How can I help you?'),
        ];
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        cacheService.getCachedConversation.mockResolvedValue(cachedConversation);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result).toBeDefined();
        expect(result.sessionId).toBe(sessionId);
        expect(result.messages).toHaveLength(3);
        expect(result.messages[0].role).toBe('assistant');
        expect(result.messages[0].content).toBe('Welcome!');
        expect(result.totalMessages).toBe(3);
        expect(result.startedAt).toEqual(mockSession.getCreatedAt());
        expect(cacheService.getCachedConversation).toHaveBeenCalledWith(sessionId);
      });

      it('should retrieve conversation history from database when not in cache', async () => {
        // Arrange
        const sessionId = 'test-session-456';
        const userId = 1;
        const conversation = [
          TestDataFactory.createMockConversationMessage('assistant', 'Welcome to the session'),
          TestDataFactory.createMockConversationMessage('user', 'I need help with my process'),
        ];
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.sessionId).toBe(sessionId);
        expect(result.messages).toHaveLength(2);
        expect(result.messages[1].content).toBe('I need help with my process');
        expect(sessionRepository.findById).toHaveBeenCalledWith(sessionId);
        expect(cacheService.cacheConversation).toHaveBeenCalledWith(sessionId, expect.any(Array));
      });

      it('should handle empty conversation history', async () => {
        // Arrange
        const sessionId = 'test-session-empty';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation: [],
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.messages).toEqual([]);
        expect(result.totalMessages).toBe(0);
        expect(result.lastMessageAt).toEqual(result.startedAt);
      });

      it('should calculate lastMessageAt correctly', async () => {
        // Arrange
        const sessionId = 'test-session-time';
        const userId = 1;
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        
        const conversation = [
          { ...TestDataFactory.createMockConversationMessage('assistant', 'Welcome'), timestamp: tenMinutesAgo },
          { ...TestDataFactory.createMockConversationMessage('user', 'Hello'), timestamp: fiveMinutesAgo },
          { ...TestDataFactory.createMockConversationMessage('assistant', 'How are you?'), timestamp: now },
        ];
        
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation,
          createdAt: tenMinutesAgo,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.lastMessageAt).toEqual(now);
        expect(result.startedAt).toEqual(tenMinutesAgo);
      });

      it('should preserve message metadata', async () => {
        // Arrange
        const sessionId = 'test-session-metadata';
        const userId = 1;
        const conversation = [
          {
            ...TestDataFactory.createMockConversationMessage('user', 'Complex question'),
            metadata: { intent: 'inquiry', priority: 'high' },
          },
          {
            ...TestDataFactory.createMockConversationMessage('assistant', 'Detailed answer'),
            metadata: { confidence: 0.9, tokens: 150 },
          },
        ];
        
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.messages[0].metadata).toEqual({ intent: 'inquiry', priority: 'high' });
        expect(result.messages[1].metadata).toEqual({ confidence: 0.9, tokens: 150 });
      });
    });

    describe('異常系', () => {
      it('should throw error when sessionId is missing', async () => {
        // Arrange
        const input = { sessionId: '', userId: 1 };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Session ID is required'),
        );
      });

      it('should throw error when userId is missing', async () => {
        // Arrange
        const input = { sessionId: 'test-123', userId: 0 };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('User ID is required'),
        );
      });

      it('should throw error when session not found', async () => {
        // Arrange
        const sessionId = 'non-existent';
        const userId = 1;

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when user does not own session (cache path)', async () => {
        // Arrange
        const sessionId = 'test-session-123';
        const userId = 1;
        const differentUserId = 999;
        const cachedConversation = [
          TestDataFactory.createMockConversationMessage('assistant', 'Welcome'),
        ];
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId: differentUserId,
        });

        cacheService.getCachedConversation.mockResolvedValue(cachedConversation);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when user does not own session (database path)', async () => {
        // Arrange
        const sessionId = 'test-session-456';
        const userId = 1;
        const differentUserId = 999;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId: differentUserId,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
        );
      });
    });

    describe('Caching behavior', () => {
      it('should cache conversation after retrieving from database', async () => {
        // Arrange
        const sessionId = 'test-session-cache';
        const userId = 1;
        const conversation = [
          TestDataFactory.createMockConversationMessage('assistant', 'Hello'),
          TestDataFactory.createMockConversationMessage('user', 'Hi'),
        ];
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(cacheService.cacheConversation).toHaveBeenCalledWith(
          sessionId,
          expect.arrayContaining([
            expect.objectContaining({ role: 'assistant', content: 'Hello' }),
            expect.objectContaining({ role: 'user', content: 'Hi' }),
          ]),
        );
      });

      it('should not cache empty conversation', async () => {
        // Arrange
        const sessionId = 'test-session-no-cache';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation: [],
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(cacheService.cacheConversation).not.toHaveBeenCalled();
      });

      it('should not query database when cache hit', async () => {
        // Arrange
        const sessionId = 'test-session-cached';
        const userId = 1;
        const cachedConversation = [
          TestDataFactory.createMockConversationMessage('assistant', 'Cached message'),
        ];
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        cacheService.getCachedConversation.mockResolvedValue(cachedConversation);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(sessionRepository.findById).toHaveBeenCalledTimes(1); // Only for ownership check
        expect(cacheService.cacheConversation).not.toHaveBeenCalled();
      });
    });

    describe('Data transformation', () => {
      it('should correctly map conversation messages to DTO format', async () => {
        // Arrange
        const sessionId = 'test-session-transform';
        const userId = 1;
        const conversation = [
          {
            role: 'system' as const,
            content: 'System prompt',
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
          {
            role: 'user' as const,
            content: 'User message',
            timestamp: new Date('2024-01-01T10:01:00Z'),
          },
          {
            role: 'assistant' as const,
            content: 'Assistant response',
            timestamp: new Date('2024-01-01T10:02:00Z'),
          },
        ];
        
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.messages).toEqual([
          {
            role: 'system',
            content: 'System prompt',
            timestamp: new Date('2024-01-01T10:00:00Z'),
            metadata: undefined,
          },
          {
            role: 'user',
            content: 'User message',
            timestamp: new Date('2024-01-01T10:01:00Z'),
            metadata: undefined,
          },
          {
            role: 'assistant',
            content: 'Assistant response',
            timestamp: new Date('2024-01-01T10:02:00Z'),
            metadata: undefined,
          },
        ]);
      });

      it('should handle missing timestamps gracefully', async () => {
        // Arrange
        const sessionId = 'test-session-no-timestamp';
        const userId = 1;
        const conversation = [
          {
            role: 'user' as const,
            content: 'Message without timestamp',
            timestamp: undefined,
          },
        ];
        
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation,
        });

        cacheService.getCachedConversation.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.messages[0].timestamp).toBeInstanceOf(Date);
      });
    });
  });
});