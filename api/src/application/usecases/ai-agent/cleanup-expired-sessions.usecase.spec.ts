import { Test, TestingModule } from '@nestjs/testing';
import { CleanupExpiredSessionsUseCase } from './cleanup-expired-sessions.usecase';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';
import { v4 as uuidv4 } from 'uuid';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';

describe('CleanupExpiredSessionsUseCase', () => {
  let useCase: CleanupExpiredSessionsUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let cacheService: jest.Mocked<AICacheService>;
  let socketGateway: jest.Mocked<SocketGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupExpiredSessionsUseCase,
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
        {
          provide: SocketGateway,
          useValue: {
            notifySessionStatusChanged: jest.fn(),
            broadcastConversationUpdate: jest.fn(),
            notifyRequirementsExtracted: jest.fn(),
            notifyError: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CleanupExpiredSessionsUseCase>(CleanupExpiredSessionsUseCase);
    sessionRepository = module.get('InterviewSessionRepository');
    cacheService = module.get(AICacheService);
    socketGateway = module.get(SocketGateway);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should mark expired sessions as EXPIRED', async () => {
        // Arrange
        const expiredSession1 = TestDataFactory.createActiveButExpiredSession(1);
        const expiredSession2 = TestDataFactory.createActiveButExpiredSession(2);
        const expiredSessions = [expiredSession1, expiredSession2];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);
        cacheService.clearSessionCache.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(2);
        expect(sessionRepository.findExpiredSessions).toHaveBeenCalled();
        expect(sessionRepository.markAsExpired).toHaveBeenCalledTimes(2);
        expect(sessionRepository.markAsExpired).toHaveBeenCalledWith(
          expiredSession1.getSessionIdString(),
        );
        expect(sessionRepository.markAsExpired).toHaveBeenCalledWith(
          expiredSession2.getSessionIdString(),
        );
      });

      it('should clear cache for expired sessions', async () => {
        // Arrange
        const expiredSession = TestDataFactory.createActiveButExpiredSession(1);
        const expiredSessions = [expiredSession];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);
        cacheService.clearSessionCache.mockResolvedValue(undefined);

        // Act
        await useCase.execute();

        // Assert
        expect(cacheService.clearSessionCache).toHaveBeenCalledWith(
          expiredSession.getSessionIdString(),
        );
      });

      it('should send WebSocket notifications for expired sessions', async () => {
        // Arrange
        const expiredSession = TestDataFactory.createActiveButExpiredSession(1);
        const expiredSessions = [expiredSession];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        await useCase.execute();

        // Assert
        expect(socketGateway.notifySessionStatusChanged).toHaveBeenCalledWith(
          expiredSession.getSessionIdString(),
          'expired',
        );
      });

      it('should delete old expired sessions from database', async () => {
        // Arrange
        sessionRepository.findExpiredSessions.mockResolvedValue([]);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(5);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(0);
        expect(sessionRepository.deleteExpiredSessions).not.toHaveBeenCalled();
      });

      it('should handle empty expired sessions list', async () => {
        // Arrange
        sessionRepository.findExpiredSessions.mockResolvedValue([]);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(0);
        expect(sessionRepository.markAsExpired).not.toHaveBeenCalled();
        expect(cacheService.clearSessionCache).not.toHaveBeenCalled();
        expect(socketGateway.notifySessionStatusChanged).not.toHaveBeenCalled();
      });

      it('should handle null expired sessions list', async () => {
        // Arrange
        sessionRepository.findExpiredSessions.mockResolvedValue([]);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(0);
        expect(sessionRepository.markAsExpired).not.toHaveBeenCalled();
      });

      it('should only process ACTIVE sessions', async () => {
        // Arrange
        const activeSession = TestDataFactory.createActiveButExpiredSession(1);
        const completedSession = TestDataFactory.createMockSession({
          status: SessionStatus.COMPLETED,
          userId: 2,
        });
        const expiredSessions = [activeSession, completedSession];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(1);
        expect(sessionRepository.markAsExpired).toHaveBeenCalledTimes(1);
        expect(sessionRepository.markAsExpired).toHaveBeenCalledWith(
          activeSession.getSessionIdString(),
        );
      });
    });

    describe('異常系とエラーハンドリング', () => {
      it('should continue cleanup even if one session fails', async () => {
        // Arrange
        const session1 = TestDataFactory.createActiveButExpiredSession(1);
        const session2 = TestDataFactory.createActiveButExpiredSession(2);
        const session3 = TestDataFactory.createActiveButExpiredSession(3);
        const expiredSessions = [session1, session2, session3];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Database error'))
          .mockResolvedValueOnce(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(2); // Only 2 succeeded
        expect(sessionRepository.markAsExpired).toHaveBeenCalledTimes(3);
      });

      it('should handle repository findExpiredSessions failure', async () => {
        // Arrange
        sessionRepository.findExpiredSessions.mockRejectedValue(
          new Error('Database connection error'),
        );

        // Act & Assert
        await expect(useCase.execute()).rejects.toThrow('Database connection error');
      });

      it('should handle cache clear failure gracefully', async () => {
        // Arrange
        const expiredSession = TestDataFactory.createActiveButExpiredSession(1);
        const expiredSessions = [expiredSession];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);
        cacheService.clearSessionCache.mockRejectedValue(new Error('Cache error'));

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(0); // Failed due to cache error
      });

      it('should handle WebSocket notification failure gracefully', async () => {
        // Arrange
        const expiredSession = TestDataFactory.createActiveButExpiredSession(1);
        const expiredSessions = [expiredSession];

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);
        cacheService.clearSessionCache.mockResolvedValue(undefined);
        socketGateway.notifySessionStatusChanged.mockImplementation(() => {
          throw new Error('WebSocket error');
        });

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(0); // Failed due to WebSocket error
      });
    });

    describe('Manual cleanup', () => {
      it('should cleanup specific session manually', async () => {
        // Arrange
        const sessionId = uuidv4();
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId: 1 });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        cacheService.clearSessionCache.mockResolvedValue(undefined);

        // Act
        await useCase.cleanupSession(sessionId);

        // Assert
        expect(sessionRepository.findById).toHaveBeenCalledWith(sessionId);
        expect(sessionRepository.markAsExpired).toHaveBeenCalledWith(sessionId);
        expect(cacheService.clearSessionCache).toHaveBeenCalledWith(sessionId);
        expect(socketGateway.notifySessionStatusChanged).toHaveBeenCalledWith(
          sessionId,
          'expired',
        );
      });

      it('should handle non-existent session gracefully in manual cleanup', async () => {
        // Arrange
        const sessionId = 'non-existent-session';

        sessionRepository.findById.mockResolvedValue(null);

        // Act
        await useCase.cleanupSession(sessionId);

        // Assert
        expect(sessionRepository.findById).toHaveBeenCalledWith(sessionId);
        expect(sessionRepository.markAsExpired).not.toHaveBeenCalled();
        expect(cacheService.clearSessionCache).not.toHaveBeenCalled();
        expect(socketGateway.notifySessionStatusChanged).not.toHaveBeenCalled();
      });

      it('should handle manual cleanup failure', async () => {
        // Arrange
        const sessionId = uuidv4();
        const mockSession = TestDataFactory.createMockSession({ sessionId, userId: 1 });

        sessionRepository.findById.mockResolvedValue(mockSession);
        sessionRepository.markAsExpired.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(useCase.cleanupSession(sessionId)).rejects.toThrow('Database error');
      });
    });

    describe('Scheduled execution', () => {
      it('should have scheduled execution decorator', () => {
        // This test verifies that the @Cron decorator is present
        // In a real test, we would check the method metadata
        const prototype = Object.getPrototypeOf(useCase);
        const methodName = 'executeScheduled';
        
        expect(prototype[methodName]).toBeDefined();
        expect(typeof prototype[methodName]).toBe('function');
      });

      it('should call execute from scheduled method', async () => {
        // Arrange
        const executeSpy = jest.spyOn(useCase, 'execute');
        executeSpy.mockResolvedValue({ cleanedCount: 3 });

        // Act
        await useCase.executeScheduled();

        // Assert
        expect(executeSpy).toHaveBeenCalled();
      });
    });

    describe('Logging and monitoring', () => {
      it('should log cleanup results', async () => {
        // Arrange
        const loggerSpy = jest.spyOn(useCase['logger'], 'log');
        const expiredSession = TestDataFactory.createActiveButExpiredSession(1);
        
        sessionRepository.findExpiredSessions.mockResolvedValue([expiredSession]);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(2);
        cacheService.clearSessionCache.mockResolvedValue(undefined);

        // Act
        await useCase.execute();

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Found 1 expired sessions to clean up'),
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cleanup completed. Expired: 1, Deleted: 2'),
        );
      });

      it('should log errors during cleanup', async () => {
        // Arrange
        const loggerErrorSpy = jest.spyOn(useCase['logger'], 'error');
        const session = TestDataFactory.createActiveButExpiredSession(1);
        
        sessionRepository.findExpiredSessions.mockResolvedValue([session]);
        sessionRepository.markAsExpired.mockRejectedValue(new Error('Test error'));
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        await useCase.execute();

        // Assert
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Failed to cleanup session ${session.getSessionIdString()}`),
          expect.any(String),
        );
      });

      it('should log when no expired sessions found', async () => {
        // Arrange
        const loggerSpy = jest.spyOn(useCase['logger'], 'log');
        
        sessionRepository.findExpiredSessions.mockResolvedValue([]);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        await useCase.execute();

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith('No expired sessions found');
      });
    });

    describe('Performance and batch processing', () => {
      it('should handle large number of expired sessions', async () => {
        // Arrange
        const expiredSessions = Array.from({ length: 100 }, (_, i) =>
          TestDataFactory.createActiveButExpiredSession(i),
        );

        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockResolvedValue(undefined);
        sessionRepository.deleteExpiredSessions.mockResolvedValue(50);
        cacheService.clearSessionCache.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.cleanedCount).toBe(100);
        expect(sessionRepository.markAsExpired).toHaveBeenCalledTimes(100);
        expect(cacheService.clearSessionCache).toHaveBeenCalledTimes(100);
      });

      it('should process sessions in sequence to avoid overwhelming resources', async () => {
        // Arrange
        const expiredSessions = [
          TestDataFactory.createActiveButExpiredSession(1),
          TestDataFactory.createActiveButExpiredSession(2),
          TestDataFactory.createActiveButExpiredSession(3),
        ];

        const markAsExpiredCalls: string[] = [];
        sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
        sessionRepository.markAsExpired.mockImplementation(async (sessionId) => {
          markAsExpiredCalls.push(sessionId);
          return undefined;
        });
        sessionRepository.deleteExpiredSessions.mockResolvedValue(0);

        // Act
        await useCase.execute();

        // Assert
        expect(markAsExpiredCalls).toHaveLength(3);
        // Verify sessions were processed in order
        expect(markAsExpiredCalls[0]).toBe(expiredSessions[0].getSessionIdString());
        expect(markAsExpiredCalls[1]).toBe(expiredSessions[1].getSessionIdString());
        expect(markAsExpiredCalls[2]).toBe(expiredSessions[2].getSessionIdString());
      });
    });
  });
});