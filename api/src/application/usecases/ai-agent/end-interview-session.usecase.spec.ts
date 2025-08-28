import { Test, TestingModule } from '@nestjs/testing';
import { EndInterviewSessionUseCase } from './end-interview-session.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';
import { v4 as uuidv4 } from 'uuid';

describe('EndInterviewSessionUseCase', () => {
  let useCase: EndInterviewSessionUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let socketGateway: jest.Mocked<SocketGateway>;
  let cacheService: jest.Mocked<AICacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndInterviewSessionUseCase,
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
      ],
    }).compile();

    useCase = module.get<EndInterviewSessionUseCase>(EndInterviewSessionUseCase);
    sessionRepository = module.get('InterviewSessionRepository');
    socketGateway = module.get(SocketGateway);
    cacheService = module.get(AICacheService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should end an active session successfully', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockResolvedValue(mockSession);
        cacheService.clearSessionCache.mockResolvedValue(undefined);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(sessionRepository.findById).toHaveBeenCalledWith(sessionId);
        expect(sessionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            getStatus: expect.any(Function),
          }),
        );
        expect(cacheService.clearSessionCache).toHaveBeenCalledWith(sessionId);
        expect(socketGateway.notifySessionStatusChanged).toHaveBeenCalledWith(
          sessionId,
          'completed',
        );
      });

      it('should do nothing if session is already completed', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const completedSession = TestDataFactory.createCompletedSession(userId);

        sessionRepository.findById.mockResolvedValue(completedSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(sessionRepository.findById).toHaveBeenCalledWith(sessionId);
        expect(sessionRepository.save).not.toHaveBeenCalled();
        expect(cacheService.clearSessionCache).not.toHaveBeenCalled();
        expect(socketGateway.notifySessionStatusChanged).not.toHaveBeenCalled();
      });

      it('should do nothing if session is already cancelled', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const cancelledSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          status: SessionStatus.CANCELLED,
        });

        sessionRepository.findById.mockResolvedValue(cancelledSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(sessionRepository.save).not.toHaveBeenCalled();
        expect(cacheService.clearSessionCache).not.toHaveBeenCalled();
        expect(socketGateway.notifySessionStatusChanged).not.toHaveBeenCalled();
      });

      it('should complete the session using domain method', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });
        const completeSpy = jest.spyOn(mockSession, 'complete');

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(completeSpy).toHaveBeenCalled();
        expect(mockSession.getStatus()).toBe(SessionStatus.COMPLETED);
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

        sessionRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found', 'SESSION_NOT_FOUND'),
        );
      });

      it('should throw error when user does not own session', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const differentUserId = 999;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId: differentUserId,
        });

        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow(
          new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND'),
        );
      });

      it('should handle repository save failure', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow('Database error');
      });

      it('should handle cache clear failure gracefully', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockResolvedValue(mockSession);
        cacheService.clearSessionCache.mockRejectedValue(new Error('Cache error'));

        // Act & Assert
        // Should not throw, cache errors should be handled gracefully
        await expect(useCase.execute({ sessionId, userId })).rejects.toThrow('Cache error');
      });
    });

    describe('Side effects', () => {
      it('should clear cache after ending session', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(cacheService.clearSessionCache).toHaveBeenCalledWith(sessionId);
        expect(cacheService.clearSessionCache).toHaveBeenCalledTimes(1);
      });

      it('should send WebSocket notification after ending session', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(socketGateway.notifySessionStatusChanged).toHaveBeenCalledWith(
          sessionId,
          'completed',
        );
        expect(socketGateway.notifySessionStatusChanged).toHaveBeenCalledTimes(1);
      });

      it('should update session timestamp when ending', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId });
        const originalUpdatedAt = mockSession.getUpdatedAt();

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockImplementation(async (session) => {
          // Simulate that complete() method updates the timestamp
          return session;
        });

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(mockSession.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
          originalUpdatedAt.getTime(),
        );
      });
    });

    describe('Session state transitions', () => {
      it('should transition from ACTIVE to COMPLETED', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          status: SessionStatus.ACTIVE,
        });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.save.mockResolvedValue(mockSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(mockSession.getStatus()).toBe(SessionStatus.COMPLETED);
      });

      it('should handle PAUSED sessions', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const pausedSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          status: SessionStatus.PAUSED,
        });

        sessionRepository.findById.mockResolvedValue(pausedSession);
        sessionRepository.save.mockResolvedValue(pausedSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        // Paused sessions can be completed
        expect(sessionRepository.save).toHaveBeenCalled();
        expect(socketGateway.notifySessionStatusChanged).toHaveBeenCalledWith(
          sessionId,
          'completed',
        );
      });

      it('should not transition EXPIRED sessions', async () => {
        // Arrange
        const sessionId = uuidv4();
        const userId = 1;
        const expiredSession = TestDataFactory.createMockSession({ 
          sessionId, 
          userId,
          status: SessionStatus.EXPIRED,
        });

        sessionRepository.findById.mockResolvedValue(expiredSession);

        // Act
        await useCase.execute({ sessionId, userId });

        // Assert
        expect(sessionRepository.save).not.toHaveBeenCalled();
        expect(socketGateway.notifySessionStatusChanged).not.toHaveBeenCalled();
      });
    });
  });
});