import { Injectable, Inject, Logger } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';

export interface EndSessionInput {
  sessionId: string;
  userId: number;
}

@Injectable()
export class EndInterviewSessionUseCase {
  private readonly logger = new Logger(EndInterviewSessionUseCase.name);

  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    private readonly socketGateway: SocketGateway,
    private readonly cacheService: AICacheService,
  ) {}

  async execute(input: EndSessionInput): Promise<void> {
    // Validate input
    this.validateInput(input);

    // Get session from database
    const session = await this.sessionRepository.findById(input.sessionId);
    
    if (!session) {
      throw new DomainException('Session not found', 'SESSION_NOT_FOUND');
    }

    // Verify user owns the session
    if (session.getUserId() !== input.userId) {
      throw new DomainException('Session not found or access denied', 'SESSION_NOT_FOUND');
    }

    // Check if session is already ended
    const currentStatus = session.getStatus();
    if (currentStatus === SessionStatus.COMPLETED || currentStatus === SessionStatus.CANCELLED) {
      return; // Already ended, nothing to do
    }

    // Handle EXPIRED sessions - just return without processing
    if (currentStatus === SessionStatus.EXPIRED) {
      this.logger.warn(`Session ${input.sessionId} is already expired, cannot complete`);
      return;
    }

    // Handle PAUSED sessions - can be completed directly
    if (currentStatus === SessionStatus.PAUSED) {
      // PAUSED sessions can be completed, but we need to update status directly
      // to avoid the isActive() check in complete() method
      const sessionEntity = session as any; // Access private properties
      sessionEntity.status = SessionStatus.COMPLETED;
      sessionEntity.updatedAt = new Date();
    } else {
      // ACTIVE sessions use the normal complete() method
      session.complete();
    }

    // Save updated session
    await this.sessionRepository.save(session);

    // Clear cache
    await this.cacheService.clearSessionCache(input.sessionId);

    // Send WebSocket notification
    this.socketGateway.notifySessionStatusChanged(input.sessionId, 'completed');
  }

  private validateInput(input: EndSessionInput): void {
    if (!input.sessionId) {
      throw new DomainException('Session ID is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
  }
}