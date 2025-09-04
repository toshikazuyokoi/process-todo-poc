import { Injectable, Inject } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { AI_CONVERSATION_RESPONDER, AIConversationResponder } from '../../interfaces/ai-agent/ai-conversation-responder.interface';
import { ProcessAnalysisService } from '../../../domain/ai-agent/services/process-analysis.service';
import { AIRateLimitService } from '../../../infrastructure/ai/ai-rate-limit.service';
import { AIMonitoringService } from '../../../infrastructure/monitoring/ai-monitoring.service';
import { BackgroundJobQueueInterface } from '../../../infrastructure/queue/background-job-queue.interface';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { AIAuditService } from '../../../infrastructure/monitoring/ai-audit.service';
import { ProcessMessageInput, ProcessMessageOutput } from '../../dto/ai-agent/send-message.dto';
import { LLMOutputParser } from '../../services/ai-agent/llm-output-parser.service';
import { InterviewSession, SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';
import { ConversationMessageDto, AIResponse, ProcessRequirement } from '../../../domain/ai-agent/types';
import { ConversationMessageMapper } from '../../../domain/ai-agent/mappers/conversation-message.mapper';
import { ConversationMessage } from '../../../domain/ai-agent/entities/conversation-message.entity';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { JobType } from '../../../infrastructure/queue/background-job-queue.interface';

@Injectable()
export class ProcessUserMessageUseCase {
  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    @Inject(AI_CONVERSATION_RESPONDER)
    private readonly conversationService: AIConversationResponder,
    private readonly analysisService: ProcessAnalysisService,
    private readonly rateLimitService: AIRateLimitService,
    private readonly monitoringService: AIMonitoringService,
    @Inject('BackgroundJobQueue')
    private readonly backgroundJobQueue: BackgroundJobQueueInterface,
    private readonly socketGateway: SocketGateway,
    private readonly cacheService: AICacheService,
    private readonly auditService: AIAuditService,
    private readonly parser: LLMOutputParser,
  ) {}

  async execute(input: ProcessMessageInput): Promise<ProcessMessageOutput> {
    // 1. Validate input
    this.validateInput(input);

    // 2. Check rate limit (100 messages per hour)
    await this.checkRateLimit(input.userId);

    // 3. Load session
    const session = await this.loadSession(input.sessionId);

    // 4. Validate session
    this.validateSession(session, input.userId);

    // 5. Process message with AI
    let aiResponse: AIResponse;
    try {
      aiResponse = await this.processMessage(session, input.message);
    } catch (error) {
      // DomainExceptionは再スロー
      if (error instanceof DomainException) {
        throw error;
      }
      aiResponse = await this.handleOpenAIError(error, session, input.message);
    }

    // Parse structured JSON (log/monitor only; API response unchanged)
    const parsed = this.parser.extractTemplateJson(aiResponse.content);
    if (!parsed.ok) {
      this.monitoringService.logAIError(input.userId, 'parse_structured_json', new Error((parsed.errors||[]).join(',')));
    } else {
      this.monitoringService.logAIRequest(input.userId, 'structured_json_ok', aiResponse.tokenCount || 0, aiResponse.estimatedCost || 0);
    }

    // Audit hash (no prompt/content persistence)
    try {
      const conversationForHash = session.getConversation().map(msg => ({
        role: msg.getRole() as string,
        content: typeof msg.getContent() === 'string' ? (msg.getContent() as string) : JSON.stringify(msg.getContent()),
      }));
      conversationForHash.push({ role: 'user', content: input.message });
      conversationForHash.push({ role: 'assistant', content: aiResponse.content });
      const hash = this.auditService.computeConversationHash(conversationForHash);
      if (hash) {
        this.monitoringService.logAIRequest(input.userId, 'audit_hash', 0, 0);
      }
    } catch {}


    // 6. Update conversation
    const userMessageEntity = ConversationMessageMapper.createUserMessage(
      input.message,
      input.metadata,
    );

    const assistantMessageEntity = ConversationMessageMapper.createAssistantMessage(
      aiResponse.content,
      aiResponse.confidence,
      aiResponse.tokenCount,
      aiResponse.suggestedQuestions,
    );

    // Add messages to conversation
    session.addMessage(userMessageEntity);
    session.addMessage(assistantMessageEntity);

    // 7. Extract requirements asynchronously
    await this.backgroundJobQueue.addJob({
      type: JobType.REQUIREMENT_ANALYSIS,
      userId: input.userId,
      sessionId: input.sessionId,
      payload: {
        sessionId: input.sessionId,
        conversation: session.getConversation(),
        context: session.getContext(),
      },
    });

    // 8. Update session
    await this.updateSession(session);

    // 9. Update cache
    await this.cacheService.cacheConversation(input.sessionId, session.getConversation());

    // 10. Log usage
    await this.logUsage(
      input.userId,
      aiResponse.tokenCount || 0,
      aiResponse.estimatedCost || 0,
    );

    // 11. Send WebSocket notification
    this.socketGateway.broadcastConversationUpdate(input.sessionId, {
      message: ConversationMessageMapper.toDto(userMessageEntity),
      response: ConversationMessageMapper.toDto(assistantMessageEntity),
      timestamp: new Date(),
    });

    // 12. Calculate conversation progress
    // Convert conversation entities to simple format for analysis service
    const conversationForAnalysis = session.getConversation().map(msg => {
      const content = msg.getContent();
      return {
        role: msg.getRole() as 'user' | 'assistant',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: msg.getTimestamp(),
      };
    });
    
    const conversationProgress = await this.analysisService.calculateConversationProgress(
      conversationForAnalysis,
      session.getExtractedRequirements() as any,
    );

    return {
      sessionId: input.sessionId,
      userMessage: {
        content: input.message,
        timestamp: userMessageEntity.getTimestamp(),
      },
      aiResponse: {
        content: aiResponse.content,
        suggestedQuestions: aiResponse.suggestedQuestions,
        confidence: aiResponse.confidence,
        timestamp: assistantMessageEntity.getTimestamp(),
      },
      conversationProgress,
    };
  }

  private validateInput(input: ProcessMessageInput): void {
    if (!input.sessionId) {
      throw new DomainException('Session ID is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
    if (!input.message || input.message.trim().length === 0) {
      throw new DomainException('Message is required');
    }
    if (input.message.length > 2000) {
      throw new DomainException('Message must be less than 2000 characters');
    }
  }

  private async checkRateLimit(userId: number): Promise<void> {
    const canProceed = await this.rateLimitService.checkRateLimit(
      userId,
      100, // 100 messages per day limit
    );

    if (!canProceed) {
      throw new DomainException(
        'Rate limit exceeded. Maximum 100 messages per hour.',
        'RATE_LIMIT_EXCEEDED',
      );
    }
  }

  private async loadSession(sessionId: string): Promise<InterviewSession> {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session) {
      throw new DomainException('Session not found', 'SESSION_NOT_FOUND');
    }

    return session;
  }

  private validateSession(session: InterviewSession, userId: number): void {
    // Verify user owns the session
    if (session.getUserId() !== userId) {
      throw new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND');
    }

    // Check session status
    if (session.getStatus() !== SessionStatus.ACTIVE) {
      throw new DomainException(
        `Session is ${session.getStatus()}. Only active sessions can receive messages.`,
        'SESSION_INACTIVE',
      );
    }

    // Check session expiration
    if (session.isExpired()) {
      throw new DomainException('Session has expired', 'SESSION_EXPIRED');
    }
  }

  private async processMessage(
    session: InterviewSession,
    message: string,
  ): Promise<AIResponse> {
    const conversationDtos = ConversationMessageMapper.toDtoArray(session.getConversation());
    const conversationSession = {
      sessionId: session.getSessionIdString(),
      context: session.getContext(),
      conversationHistory: conversationDtos,
    };

    const result = await this.conversationService.processMessage(conversationSession, message);
    
    // Convert result to AIResponse (use actual token count if provided)
    return {
      content: result.response,
      suggestedQuestions: [],
      confidence: undefined,
      tokenCount: result.tokenCount ?? 0,
      estimatedCost: result.estimatedCost ?? 0,
      error: false,
    };
  }

  private async extractRequirements(
    conversation: ConversationMessage[],
  ): Promise<ProcessRequirement[]> {
    // Convert entities to DTOs for analysis service
    const conversationDtos = ConversationMessageMapper.toDtoArray(conversation);
    // Note: extractRequirements method needs to be implemented in ProcessAnalysisService
    return [];
  }

  private async updateSession(session: InterviewSession): Promise<void> {
    await this.sessionRepository.updateConversation(
      session.getSessionIdString(),
      session.getConversation(),
    );
  }

  private async handleOpenAIError(
    error: any,
    session: InterviewSession,
    message: string,
  ): Promise<AIResponse> {
    const errorCode = error.response?.status || error.code;
    
    // Check if error is retryable
    if (this.isRetryableError(errorCode)) {
      // Calculate backoff time
      const retryCount = 0; // Start with 0 for simplicity
      const backoffTime = this.calculateBackoff(retryCount);
      
      // Wait and retry
      await this.waitForRetry(backoffTime);
      
      // Retry the request
      try {
        return await this.processMessage(session, message);
      } catch (retryError) {
        // If retry fails, return fallback response
        return this.createFallbackResponse();
      }
    }
    
    // Non-retryable error, return fallback response
    return this.createFallbackResponse();
  }

  private isRetryableError(errorCode: number | string): boolean {
    const retryableCodes = [429, 503, 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    return retryableCodes.includes(errorCode);
  }

  private calculateBackoff(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
  }

  private async waitForRetry(backoffTime: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, backoffTime));
  }

  private createFallbackResponse(): AIResponse {
    return {
      content: '現在AI応答の生成で問題が発生しました。しばらくしてから再度お試しください。必要であれば、要件や前提条件をもう一度共有してください。',
      suggestedQuestions: [],
      confidence: 0,
      tokenCount: 0,
      estimatedCost: 0,
      error: true,
    };
  }

  private async logUsage(userId: number, tokens: number, cost: number): Promise<void> {
    await this.monitoringService.logUsage(
      userId,
      tokens,
      cost,
    );
  }
}