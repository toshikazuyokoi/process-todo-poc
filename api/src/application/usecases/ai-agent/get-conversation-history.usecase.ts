import { Injectable, Inject } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { ConversationHistoryDto } from '../../dto/ai-agent/message-response.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { ConversationMessageDto } from '../../../domain/ai-agent/types';
import { ConversationMessage } from '../../../domain/ai-agent/entities/conversation-message.entity';
import { ConversationMessageMapper } from '../../../domain/ai-agent/mappers/conversation-message.mapper';

export interface GetConversationInput {
  sessionId: string;
  userId: number;
}

@Injectable()
export class GetConversationHistoryUseCase {
  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    private readonly cacheService: AICacheService,
  ) {}

  async execute(input: GetConversationInput): Promise<ConversationHistoryDto> {
    // Validate input
    this.validateInput(input);

    // Try to get conversation from cache first
    const cachedConversation = await this.cacheService.getCachedConversation(input.sessionId);
    
    if (cachedConversation && cachedConversation.length > 0) {
      // Still need to verify user owns the session
      const session = await this.sessionRepository.findById(input.sessionId);
      
      if (!session || session.getUserId() !== input.userId) {
        throw new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND');
      }

      return this.buildHistoryDto(
        input.sessionId,
        cachedConversation,
        session.getCreatedAt(),
      );
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

    // Get conversation from entity
    const conversation = session.getConversation();
    
    // Cache the conversation for future requests
    if (conversation && conversation.length > 0) {
      await this.cacheService.cacheConversation(input.sessionId, conversation);
    }

    return this.buildHistoryDto(
      input.sessionId,
      conversation || [],
      session.getCreatedAt(),
    );
  }

  private validateInput(input: GetConversationInput): void {
    if (!input.sessionId) {
      throw new DomainException('Session ID is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
  }

  private buildHistoryDto(
    sessionId: string,
    conversation: ConversationMessage[],
    startedAt: Date,
  ): ConversationHistoryDto {
    const messages = ConversationMessageMapper.toDtoArray(conversation);

    const lastMessageAt = messages.length > 0
      ? messages[messages.length - 1].timestamp
      : startedAt;

    return {
      sessionId,
      messages,
      totalMessages: messages.length,
      startedAt,
      lastMessageAt,
    };
  }
}