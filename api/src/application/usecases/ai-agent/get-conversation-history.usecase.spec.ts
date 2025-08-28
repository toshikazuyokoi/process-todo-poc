import { Test, TestingModule } from '@nestjs/testing';
import { GetConversationHistoryUseCase } from './get-conversation-history.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';
import { v4 as uuidv4 } from 'uuid';

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
        const sessionId = uuidv4();
        const userId = 1;
        const cachedConversation = [
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Welcome!'),
          TestDataFactory.createMockConversationMessageEntity('user', 'Hello'),
          TestDataFactory.createMockConversationMessageEntity('assistant', 'How can I help you?'),
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
        const sessionId = uuidv4();
        const userId = 1;
        const conversation = [
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Welcome to the session'),
          TestDataFactory.createMockConversationMessageEntity('user', 'I need help with my process'),
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
        const sessionId = uuidv4();
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
        const sessionId = uuidv4();
        const userId = 1;
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        
        const conversation = [
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Welcome'),
          TestDataFactory.createMockConversationMessageEntity('user', 'Hello'),
          TestDataFactory.createMockConversationMessageEntity('assistant', 'How are you?'),
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
        const sessionId = uuidv4();
        const userId = 1;
        const userMessage = TestDataFactory.createMockConversationMessageEntity('user', 'Complex question');
        const assistantMessage = TestDataFactory.createMockConversationMessageEntity('assistant', 'Detailed answer');
        
        const conversation = [userMessage, assistantMessage];
        
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
        expect(result.messages[0].metadata).toEqual(expect.objectContaining({ intent: 'test' }));
        expect(result.messages[1].metadata).toEqual(expect.objectContaining({ confidence: undefined }));
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
        const sessionId = uuidv4();
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
        const sessionId = uuidv4();
        const userId = 1;
        const differentUserId = 999;
        const cachedConversation = [
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Welcome'),
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
        const sessionId = uuidv4();
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
        const sessionId = uuidv4();
        const userId = 1;
        const conversation = [
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Hello'),
          TestDataFactory.createMockConversationMessageEntity('user', 'Hi'),
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
          expect.any(Array),
        );
      });

      it('should not cache empty conversation', async () => {
        // Arrange
        const sessionId = uuidv4();
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
        const sessionId = uuidv4();
        const userId = 1;
        const cachedConversation = [
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Cached message'),
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
        const sessionId = uuidv4();
        const userId = 1;
        const conversation = [
          TestDataFactory.createMockConversationMessageEntity('system', 'System prompt'),
          TestDataFactory.createMockConversationMessageEntity('user', 'User message'),
          TestDataFactory.createMockConversationMessageEntity('assistant', 'Assistant response'),
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
        expect(result.messages).toHaveLength(3);
        expect(result.messages[0]).toEqual(expect.objectContaining({
          role: 'system',
          content: 'System prompt',
        }));
        expect(result.messages[0].timestamp).toBeInstanceOf(Date);
        expect(result.messages[1]).toEqual(expect.objectContaining({
          role: 'user',
          content: 'User message',
        }));
        expect(result.messages[1].timestamp).toBeInstanceOf(Date);
        expect(result.messages[1].metadata).toBeDefined();
        expect(result.messages[2]).toEqual(expect.objectContaining({
          role: 'assistant',
          content: 'Assistant response',
        }));
        expect(result.messages[2].timestamp).toBeInstanceOf(Date);
        expect(result.messages[2].metadata).toBeDefined();
      });

      it('should handle missing timestamps gracefully', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const conversation = [
          TestDataFactory.createMockConversationMessageEntity('user', 'Message without timestamp'),
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