import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AIConversationService } from '../../../domain/ai-agent/services/ai-conversation.service';
import { AIConfigService } from '../../../infrastructure/ai/ai-config.service';
import { AIRateLimitService } from '../../../infrastructure/ai/ai-rate-limit.service';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { InterviewSession, SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';
import { StartSessionInput, StartSessionOutput } from '../../dto/ai-agent/start-session.dto';
import { SessionContext } from '../../../domain/ai-agent/entities/interview-session.entity';
import { ConversationMessageMapper } from '../../../domain/ai-agent/mappers/conversation-message.mapper';
import { DomainException } from '../../../domain/exceptions/domain.exception';

@Injectable()
export class StartInterviewSessionUseCase {
  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    private readonly conversationService: AIConversationService,
    private readonly configService: AIConfigService,
    private readonly rateLimitService: AIRateLimitService,
    private readonly cacheService: AICacheService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async execute(input: StartSessionInput): Promise<StartSessionOutput> {
    // 1. Validate input
    this.validateInput(input);

    // 2. Check rate limit (5 sessions per day per user)
    await this.checkRateLimit(input.userId);

    // 3. Create session context
    const context: SessionContext = {
      industry: input.industry,
      processType: input.processType,
      goal: input.goal,
      ...input.additionalContext,
    };

    // 4. Initialize conversation with AI
    const conversationSession = await this.conversationService.initializeSession(context);
    
    // 5. Generate welcome message
    const welcomeMessage = await this.generateWelcomeMessage(context);

    // 6. Create session entity
    const session = await this.createSession(input, welcomeMessage);

    // 7. Save to database
    const savedSession = await this.sessionRepository.save(session);

    // 8. Cache conversation
    const conversation = savedSession.getConversation();
    await this.cacheService.cacheConversation(savedSession.getSessionIdString(), conversation);

    // 9. Send WebSocket notification
    this.socketGateway.notifySessionStatusChanged(savedSession.getSessionIdString(), 'active');

    // 10. Return result
    return {
      sessionId: savedSession.getSessionIdString(),
      status: savedSession.getStatus(),
      welcomeMessage,
      suggestedQuestions: [],  // TODO: Implement suggested questions generation
      expiresAt: savedSession.getExpiresAt(),
      createdAt: savedSession.getCreatedAt(),
    };
  }

  private validateInput(input: StartSessionInput): void {
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
    if (!input.industry || input.industry.trim().length === 0) {
      throw new DomainException('Industry is required');
    }
    if (!input.processType || input.processType.trim().length === 0) {
      throw new DomainException('Process type is required');
    }
    if (!input.goal || input.goal.trim().length === 0) {
      throw new DomainException('Goal is required');
    }
    if (input.industry.length > 100) {
      throw new DomainException('Industry must be less than 100 characters');
    }
    if (input.processType.length > 100) {
      throw new DomainException('Process type must be less than 100 characters');
    }
    if (input.goal.length > 500) {
      throw new DomainException('Goal must be less than 500 characters');
    }
  }

  private async checkRateLimit(userId: number): Promise<void> {
    const limit = this.configService.getSessionRateLimit();
    const canProceed = await this.rateLimitService.checkRateLimit(
      userId,
      limit.maxRequestsPerDay,
    );

    if (!canProceed) {
      throw new DomainException(
        `Rate limit exceeded. Maximum ${limit.maxRequestsPerDay} sessions per day.`,
        'RATE_LIMIT_EXCEEDED',
      );
    }
  }

  private async createSession(
    input: StartSessionInput,
    welcomeMessage: string,
  ): Promise<InterviewSession> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    // Create conversation message entity
    const welcomeConversationMessage = ConversationMessageMapper.createAssistantMessage(
      welcomeMessage,
      0.95,  // High confidence for welcome message
      undefined,  // No token count for initial message
      [],  // No suggested questions yet
    );

    const session = new InterviewSession({
      sessionId,
      userId: input.userId,
      status: SessionStatus.ACTIVE,
      context: {
        industry: input.industry,
        processType: input.processType,
        goal: input.goal,
        ...input.additionalContext,
      },
      conversation: [welcomeConversationMessage],
      extractedRequirements: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    return session;
  }

  private async generateWelcomeMessage(context: SessionContext): Promise<string> {
    const welcomeMessage = await this.conversationService.generateWelcomeMessage(context);
    return welcomeMessage;
  }
}