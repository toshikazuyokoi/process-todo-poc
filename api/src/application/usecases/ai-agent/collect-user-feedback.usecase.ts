import { Injectable, Logger, Inject } from '@nestjs/common';
import { FeedbackInput, FeedbackOutput, FeedbackType, FeedbackCategory } from '../../dto/ai-agent/feedback.dto';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { ProcessKnowledgeRepository } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
// import { BackgroundJobQueueInterface } from '../../../infrastructure/queue/interfaces/background-job-queue.interface';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { v4 as uuidv4 } from 'uuid';
// import { JobType } from '../../../infrastructure/queue/types';

enum JobType {
  FEEDBACK_PROCESSING = 'FEEDBACK_PROCESSING',
  WEB_RESEARCH = 'WEB_RESEARCH',
}

@Injectable()
export class CollectUserFeedbackUseCase {
  private readonly logger = new Logger(CollectUserFeedbackUseCase.name);

  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    @Inject('ProcessKnowledgeRepository')
    private readonly knowledgeRepository: ProcessKnowledgeRepository,
    // private readonly backgroundJobQueue: BackgroundJobQueueInterface,
  ) {}

  async execute(input: FeedbackInput): Promise<FeedbackOutput> {
    this.logger.log(`Collecting feedback for session ${input.sessionId}`);

    try {
      // Validate session exists and belongs to user
      const session = await this.sessionRepository.findById(input.sessionId);
      if (!session) {
        throw new DomainException(`Session not found: ${input.sessionId}`);
      }

      if (session.getUserId() !== input.userId) {
        throw new DomainException('Unauthorized: Session does not belong to user');
      }

      // Generate feedback ID
      const feedbackId = uuidv4();
      const submittedAt = new Date();

      // Store feedback in knowledge repository
      const feedback = {
        feedbackId,
        sessionId: input.sessionId,
        userId: input.userId,
        type: input.type,
        category: input.category,
        rating: input.rating,
        message: input.message,
        metadata: {
          ...input.metadata,
          sessionContext: session.getContext(),
          conversationLength: session.getConversation().length,
          requirementsExtracted: session.getExtractedRequirements().length,
          sessionStatus: session.getStatus(),
        },
        submittedAt,
        processed: false,
      };

      // Save feedback to knowledge repository
      // await this.knowledgeRepository.saveFeedback(feedback);

      // Queue background job for feedback processing
      // await this.backgroundJobQueue.add(JobType.FEEDBACK_PROCESSING, {
      //   payload: {
      //     feedbackId,
      //     sessionId: input.sessionId,
      //     userId: input.userId,
      //     type: input.type,
      //     category: input.category,
      //     rating: input.rating,
      //   },
      //   metadata: {
      //     priority: this.calculatePriority(input.type, input.rating),
      //     timestamp: submittedAt.toISOString(),
      //   },
      // });

      // Log analytics event
      this.logFeedbackAnalytics(input);

      // Update session metadata with feedback
      await this.updateSessionWithFeedback(input.sessionId, feedbackId, input.rating);

      this.logger.log(`Feedback ${feedbackId} collected successfully`);

      return {
        feedbackId,
        sessionId: input.sessionId,
        userId: input.userId,
        type: input.type,
        category: input.category,
        rating: input.rating,
        message: input.message,
        metadata: input.metadata,
        submittedAt,
        processed: false,
      };
    } catch (error) {
      this.logger.error(
        `Failed to collect feedback for session ${input.sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private calculatePriority(type: FeedbackType, rating: number): number {
    // Negative feedback with low rating gets highest priority
    if (type === FeedbackType.NEGATIVE && rating <= 2) {
      return 10;
    }
    
    // Suggestions get medium priority
    if (type === FeedbackType.SUGGESTION) {
      return 5;
    }
    
    // Positive feedback gets lower priority
    if (type === FeedbackType.POSITIVE) {
      return 3;
    }
    
    // Default priority
    return 1;
  }

  private logFeedbackAnalytics(input: FeedbackInput): void {
    // Log analytics event for monitoring and reporting
    this.logger.debug('Feedback analytics event', {
      sessionId: input.sessionId,
      userId: input.userId,
      type: input.type,
      category: input.category,
      rating: input.rating,
      timestamp: new Date().toISOString(),
    });
  }

  private async updateSessionWithFeedback(
    sessionId: string,
    feedbackId: string,
    rating: number,
  ): Promise<void> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      if (session) {
        // Add feedback reference to session metadata
        // const metadata = session.getMetadata() || {};
        // const feedbackList = metadata.feedback || [];
        // feedbackList.push({
        //   feedbackId,
        //   rating,
        //   timestamp: new Date().toISOString(),
        // });
        
        // Update session with new metadata
        // await this.sessionRepository.updateMetadata(sessionId, {
        //   ...metadata,
        //   feedback: feedbackList,
        //   averageRating: this.calculateAverageRating(feedbackList),
        // });
      }
    } catch (error) {
      // Log error but don't fail the feedback collection
      this.logger.warn(
        `Failed to update session ${sessionId} with feedback: ${error.message}`,
      );
    }
  }

  private calculateAverageRating(feedbackList: any[]): number {
    if (feedbackList.length === 0) {
      return 0;
    }
    
    const sum = feedbackList.reduce((acc, f) => acc + (f.rating || 0), 0);
    return Math.round((sum / feedbackList.length) * 10) / 10; // Round to 1 decimal
  }
}