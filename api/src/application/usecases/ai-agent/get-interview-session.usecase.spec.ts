import { Test, TestingModule } from '@nestjs/testing';
import { GetInterviewSessionUseCase } from './get-interview-session.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';

describe('GetInterviewSessionUseCase', () => {
  let useCase: GetInterviewSessionUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let cacheService: jest.Mocked<AICacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetInterviewSessionUseCase,
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

    useCase = module.get<GetInterviewSessionUseCase>(GetInterviewSessionUseCase);
    sessionRepository = module.get('InterviewSessionRepository');
    cacheService = module.get(AICacheService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should retrieve session from cache when available', async () => {
        // Arrange
        const sessionId = 'test-session-123';
        const userId = 1;
        const cachedSession = {
          sessionId,
          userId,
          status: SessionStatus.ACTIVE,
          context: {
            industry: 'software',
            processType: 'development',
            goal: 'Improve process',
          },
          conversation: [],
          requirements: [],
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
          updatedAt: new Date(),
          getUserId: () => userId,
        };

        cacheService.getCachedSession.mockResolvedValue(cachedSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result).toBeDefined();
        expect(result.sessionId).toBe(sessionId);
        expect(result.status).toBe(SessionStatus.ACTIVE);
        expect(result.context).toEqual(cachedSession.context);
        expect(cacheService.getCachedSession).toHaveBeenCalledWith(sessionId);
        expect(sessionRepository.findById).not.toHaveBeenCalled();
      });

      it('should retrieve session from database when not in cache', async () => {
        // Arrange
        const sessionId = 'test-session-456';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          context: {
            industry: 'healthcare',
            processType: 'patient_care',
            goal: 'Optimize workflow',
          },
        });

        cacheService.getCachedSession.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result).toBeDefined();
        expect(result.sessionId).toBe(mockSession.getSessionIdString());
        expect(result.status).toBe(mockSession.getStatus());
        expect(sessionRepository.findById).toHaveBeenCalledWith(sessionId);
        expect(cacheService.cacheSession).toHaveBeenCalledWith(mockSession);
      });

      it('should map entity to DTO correctly', async () => {
        // Arrange
        const sessionId = 'test-session-789';
        const userId = 2;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          conversation: [
            TestDataFactory.createMockConversationMessage('assistant', 'Welcome!'),
            TestDataFactory.createMockConversationMessage('user', 'Hello'),
          ],
          extractedRequirements: [
            TestDataFactory.createMockProcessRequirement(),
          ],
        });

        cacheService.getCachedSession.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.sessionId).toBe(mockSession.getSessionIdString());
        expect(result.status).toBe(mockSession.getStatus());
        expect(result.context).toEqual(mockSession.getContext());
        expect(result.conversation).toHaveLength(2);
        expect(result.requirements).toHaveLength(1);
        expect(result.expiresAt).toEqual(mockSession.getExpiresAt());
        expect(result.createdAt).toEqual(mockSession.getCreatedAt());
        expect(result.updatedAt).toEqual(mockSession.getUpdatedAt());
      });

      it('should handle both entity and cached plain object formats', async () => {
        // Arrange
        const sessionId = 'test-session-plain';
        const userId = 3;
        const plainCachedSession = {
          sessionId,
          userId,
          status: SessionStatus.ACTIVE,
          context: { industry: 'finance', processType: 'trading', goal: 'Risk management' },
          conversation: [],
          extractedRequirements: [],
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        cacheService.getCachedSession.mockResolvedValue(plainCachedSession);

        // Act
        const result = await useCase.execute({ sessionId, userId });

        // Assert
        expect(result.sessionId).toBe(sessionId);
        expect(result.status).toBe(SessionStatus.ACTIVE);
        expect(result.context).toEqual(plainCachedSession.context);
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
        const input = { sessionId: 'test-123', userId: null } as any;

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('User ID is required'),
        );
      });

      it('should throw error when session not found', async () => {
        // Arrange
        const sessionId = 'non-existent-session';
        const userId = 1;

        cacheService.getCachedSession.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when user does not own session from cache', async () => {
        // Arrange
        const sessionId = 'test-session-123';
        const userId = 1;
        const differentUserId = 999;
        const cachedSession = {
          sessionId,
          userId: differentUserId,
          status: SessionStatus.ACTIVE,
          context: {},
          conversation: [],
          requirements: [],
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          getUserId: () => differentUserId,
        };

        cacheService.getCachedSession.mockResolvedValue(cachedSession);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when user does not own session from database', async () => {
        // Arrange
        const sessionId = 'test-session-456';
        const userId = 1;
        const differentUserId = 999;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId: differentUserId,
        });

        cacheService.getCachedSession.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
        );
      });
    });

    describe('Caching behavior', () => {
      it('should cache session after retrieving from database', async () => {
        // Arrange
        const sessionId = 'test-session-cache';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        cacheService.getCachedSession.mockResolvedValue(null);
        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(cacheService.cacheSession).toHaveBeenCalledWith(mockSession);
        expect(cacheService.cacheSession).toHaveBeenCalledTimes(1);
      });

      it('should not query database when cache hit occurs', async () => {
        // Arrange
        const sessionId = 'test-session-cached';
        const userId = 1;
        const cachedSession = {
          sessionId,
          userId,
          status: SessionStatus.ACTIVE,
          context: {},
          conversation: [],
          requirements: [],
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          getUserId: () => userId,
        };

        cacheService.getCachedSession.mockResolvedValue(cachedSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(sessionRepository.findById).not.toHaveBeenCalled();
        expect(cacheService.cacheSession).not.toHaveBeenCalled();
      });
    });
  });
});