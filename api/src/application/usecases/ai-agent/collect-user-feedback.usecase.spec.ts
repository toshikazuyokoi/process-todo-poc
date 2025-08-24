import { Test, TestingModule } from '@nestjs/testing';
import { CollectUserFeedbackUseCase } from './collect-user-feedback.usecase';
import { InterviewSessionRepositoryInterface } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { ProcessKnowledgeRepositoryInterface } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { BackgroundJobQueueInterface } from '../../../infrastructure/queue/interfaces/background-job-queue.interface';
import { FeedbackType, FeedbackCategory } from '../../dto/ai-agent/feedback.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';
import { JobType } from '../../../infrastructure/queue/types';

describe('CollectUserFeedbackUseCase', () => {
  let useCase: CollectUserFeedbackUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepositoryInterface>;
  let knowledgeRepository: jest.Mocked<ProcessKnowledgeRepositoryInterface>;
  let backgroundJobQueue: jest.Mocked<BackgroundJobQueueInterface>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectUserFeedbackUseCase,
        {
          provide: 'InterviewSessionRepositoryInterface',
          useValue: {
            findById: jest.fn(),
            updateMetadata: jest.fn(),
          },
        },
        {
          provide: 'ProcessKnowledgeRepositoryInterface',
          useValue: {
            saveFeedback: jest.fn(),
          },
        },
        {
          provide: 'BackgroundJobQueueInterface',
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CollectUserFeedbackUseCase>(CollectUserFeedbackUseCase);
    sessionRepository = module.get('InterviewSessionRepositoryInterface');
    knowledgeRepository = module.get('ProcessKnowledgeRepositoryInterface');
    backgroundJobQueue = module.get('BackgroundJobQueueInterface');
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should successfully collect positive feedback', async () => {
        // Arrange
        const sessionId = 'test-session-123';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.RESPONSE_QUALITY,
          rating: 5,
          message: 'Excellent AI responses, very helpful!',
          metadata: { helpful: true },
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockResolvedValue(undefined);
        backgroundJobQueue.add.mockResolvedValue(undefined);
        sessionRepository.updateMetadata.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sessionId).toBe(sessionId);
        expect(result.userId).toBe(userId);
        expect(result.type).toBe(FeedbackType.POSITIVE);
        expect(result.rating).toBe(5);
        expect(result.processed).toBe(false);
        expect(knowledgeRepository.saveFeedback).toHaveBeenCalled();
        expect(backgroundJobQueue.add).toHaveBeenCalledWith(
          JobType.FEEDBACK_PROCESSING,
          expect.objectContaining({
            payload: expect.objectContaining({
              sessionId,
              userId,
              type: FeedbackType.POSITIVE,
              rating: 5,
            }),
          }),
        );
      });

      it('should handle negative feedback with high priority', async () => {
        // Arrange
        const sessionId = 'test-session-456';
        const userId = 2;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.NEGATIVE,
          category: FeedbackCategory.UNDERSTANDING,
          rating: 1,
          message: 'AI did not understand my requirements',
          metadata: { issue: 'comprehension' },
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockResolvedValue(undefined);
        backgroundJobQueue.add.mockResolvedValue(undefined);
        sessionRepository.updateMetadata.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.type).toBe(FeedbackType.NEGATIVE);
        expect(result.rating).toBe(1);
        expect(backgroundJobQueue.add).toHaveBeenCalledWith(
          JobType.FEEDBACK_PROCESSING,
          expect.objectContaining({
            metadata: expect.objectContaining({
              priority: 10, // High priority for negative feedback with low rating
            }),
          }),
        );
      });

      it('should process suggestion feedback', async () => {
        // Arrange
        const sessionId = 'test-session-789';
        const userId = 3;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.SUGGESTION,
          category: FeedbackCategory.OTHER,
          rating: 3,
          message: 'Would be nice to have more template options',
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockResolvedValue(undefined);
        backgroundJobQueue.add.mockResolvedValue(undefined);
        sessionRepository.updateMetadata.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.type).toBe(FeedbackType.SUGGESTION);
        expect(backgroundJobQueue.add).toHaveBeenCalledWith(
          JobType.FEEDBACK_PROCESSING,
          expect.objectContaining({
            metadata: expect.objectContaining({
              priority: 5, // Medium priority for suggestions
            }),
          }),
        );
      });

      it('should update session metadata with feedback info', async () => {
        // Arrange
        const sessionId = 'test-session-meta';
        const userId = 4;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.HELPFULNESS,
          rating: 4,
          message: 'Very helpful',
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockResolvedValue(undefined);
        backgroundJobQueue.add.mockResolvedValue(undefined);
        sessionRepository.updateMetadata.mockResolvedValue(undefined);

        // Act
        await useCase.execute(input);

        // Assert
        expect(sessionRepository.updateMetadata).toHaveBeenCalledWith(
          sessionId,
          expect.objectContaining({
            feedback: expect.arrayContaining([
              expect.objectContaining({
                rating: 4,
              }),
            ]),
            averageRating: 4,
          }),
        );
      });
    });

    describe('異常系', () => {
      it('should throw error when session not found', async () => {
        // Arrange
        const input = {
          sessionId: 'non-existent',
          userId: 1,
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.RESPONSE_QUALITY,
          rating: 5,
          message: 'Test',
        };

        sessionRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Session not found: non-existent'),
        );
      });

      it('should throw error when user is unauthorized', async () => {
        // Arrange
        const sessionId = 'test-session';
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId: 1,
        });
        
        const input = {
          sessionId,
          userId: 999, // Different user
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.RESPONSE_QUALITY,
          rating: 5,
          message: 'Test',
        };

        sessionRepository.findById.mockResolvedValue(mockSession);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Unauthorized: Session does not belong to user'),
        );
      });

      it('should handle knowledge repository save failure', async () => {
        // Arrange
        const sessionId = 'test-session';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.RESPONSE_QUALITY,
          rating: 5,
          message: 'Test',
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockRejectedValue(
          new Error('Database error'),
        );

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Database error');
      });

      it('should continue even if session metadata update fails', async () => {
        // Arrange
        const sessionId = 'test-session';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.RESPONSE_QUALITY,
          rating: 5,
          message: 'Test',
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockResolvedValue(undefined);
        backgroundJobQueue.add.mockResolvedValue(undefined);
        sessionRepository.updateMetadata.mockRejectedValue(
          new Error('Update failed'),
        );

        // Act
        const result = await useCase.execute(input);

        // Assert - Should still succeed
        expect(result.sessionId).toBe(sessionId);
        expect(result.processed).toBe(false);
      });
    });

    describe('Rating calculation', () => {
      it('should calculate average rating correctly', async () => {
        // Arrange
        const sessionId = 'test-session';
        const userId = 1;
        const mockSession = TestDataFactory.createMockSession({
          sessionId,
          userId,
        });
        
        // Mock session with existing feedback
        mockSession.getMetadata = jest.fn().mockReturnValue({
          feedback: [
            { feedbackId: 'f1', rating: 5, timestamp: '2024-01-01' },
            { feedbackId: 'f2', rating: 3, timestamp: '2024-01-02' },
          ],
        });
        
        const input = {
          sessionId,
          userId,
          type: FeedbackType.POSITIVE,
          category: FeedbackCategory.RESPONSE_QUALITY,
          rating: 4,
          message: 'Good',
        };

        sessionRepository.findById.mockResolvedValue(mockSession);
        knowledgeRepository.saveFeedback.mockResolvedValue(undefined);
        backgroundJobQueue.add.mockResolvedValue(undefined);
        sessionRepository.updateMetadata.mockResolvedValue(undefined);

        // Act
        await useCase.execute(input);

        // Assert - Average of 5, 3, 4 = 4.0
        expect(sessionRepository.updateMetadata).toHaveBeenCalledWith(
          sessionId,
          expect.objectContaining({
            averageRating: 4,
          }),
        );
      });
    });
  });
});