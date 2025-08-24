import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';
import { AICacheService } from '../../../infrastructure/cache/ai-cache.service';
import { SocketGateway } from '../../../infrastructure/websocket/socket.gateway';

@Injectable()
export class CleanupExpiredSessionsUseCase {
  private readonly logger = new Logger(CleanupExpiredSessionsUseCase.name);

  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    private readonly cacheService: AICacheService,
    private readonly socketGateway: SocketGateway,
  ) {}

  /**
   * Run cleanup every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async executeScheduled(): Promise<void> {
    this.logger.log('Starting scheduled cleanup of expired sessions');
    await this.execute();
  }

  async execute(): Promise<{ cleanedCount: number }> {
    try {
      const now = new Date();
      
      // Find all expired sessions
      const expiredSessions = await this.sessionRepository.findExpiredSessions();
      
      if (!expiredSessions || expiredSessions.length === 0) {
        this.logger.log('No expired sessions found');
        return { cleanedCount: 0 };
      }

      this.logger.log(`Found ${expiredSessions.length} expired sessions to clean up`);

      let cleanedCount = 0;

      for (const session of expiredSessions) {
        try {
          // Update session status to expired
          if (session.getStatus() === SessionStatus.ACTIVE) {
            // Mark as expired using repository method
            await this.sessionRepository.markAsExpired(session.getSessionIdString());

            // Clear cache
            await this.cacheService.clearSessionCache(session.getSessionIdString());

            // Send WebSocket notification if any clients are still connected
            this.socketGateway.notifySessionStatusChanged(session.getSessionIdString(), 'expired');

            cleanedCount++;
            
            this.logger.debug(`Cleaned up session ${session.getSessionIdString()}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to cleanup session ${session.getSessionId()}: ${error.message}`,
            error.stack,
          );
        }
      }

      // Delete expired sessions from database
      const deletedCount = await this.sessionRepository.deleteExpiredSessions();

      this.logger.log(
        `Cleanup completed. Expired: ${cleanedCount}, Deleted: ${deletedCount}`,
      );

      return { cleanedCount };
    } catch (error) {
      this.logger.error('Failed to execute session cleanup', error.stack);
      throw error;
    }
  }


  /**
   * Manual cleanup trigger for testing or admin purposes
   */
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      
      if (!session) {
        return;
      }

      // Mark as expired
      await this.sessionRepository.markAsExpired(sessionId);

      // Clear cache
      await this.cacheService.clearSessionCache(sessionId);

      // Send notification
      this.socketGateway.notifySessionStatusChanged(sessionId, 'expired');

      this.logger.log(`Manually cleaned up session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to manually cleanup session ${sessionId}`, error.stack);
      throw error;
    }
  }
}