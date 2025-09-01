import { Injectable, Inject } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { SessionResponseDto } from '../../dto/ai-agent/session-response.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';

export interface GetSessionInput {
  sessionId: string;
  userId: number;
}

@Injectable()
export class GetInterviewSessionUseCase {
  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    private readonly cacheService: AICacheService,
  ) {}

  async execute(input: GetSessionInput): Promise<SessionResponseDto> {
    // Validate input
    this.validateInput(input);

    // Try to get from cache first
    const cachedSession = await this.cacheService.getCachedSession(input.sessionId);
    if (cachedSession) {
      // Verify user owns the session (handle both entity and plain object)
      const userId = cachedSession.userId || (cachedSession.getUserId && cachedSession.getUserId());
      if (userId !== input.userId) {
        throw new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND');
      }
      return this.mapToDto(cachedSession);
    }

    // Get from database
    const session = await this.sessionRepository.findById(input.sessionId);
    
    if (!session) {
      throw new DomainException('Session not found', 'SESSION_NOT_FOUND');
    }

    // Verify user owns the session
    if (session.getUserId() !== input.userId) {
      throw new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND');
    }

    // Cache the session for future requests
    await this.cacheService.cacheSession(session);

    return this.mapToDto(session);
  }

  private validateInput(input: GetSessionInput): void {
    if (!input.sessionId) {
      throw new DomainException('Session ID is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
  }

  private mapToDto(session: any): SessionResponseDto {
    // Handle both entity and cached data
    if (typeof session.getSessionIdString === 'function') {
      // Entity with getters
      return {
        sessionId: session.getSessionIdString(),
        status: session.getStatus(),
        context: session.getContext(),
        conversation: session.getConversation() || [],
        requirements: session.getExtractedRequirements() || [],
        generatedTemplateId: session.getGeneratedTemplate()?.id,
        expiresAt: session.getExpiresAt(),
        createdAt: session.getCreatedAt(),
        updatedAt: session.getUpdatedAt(),
      };
    } else {
      // Cached plain object
      return {
        sessionId: session.sessionId,
        status: session.status,
        context: session.context,
        conversation: session.conversation || [],
        requirements: session.requirements || session.extractedRequirements || [],
        generatedTemplateId: session.generatedTemplateId || session.generatedTemplate?.id,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    }
  }
}