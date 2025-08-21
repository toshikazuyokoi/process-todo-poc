import { InterviewSession } from '../entities/interview-session.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { ProcessRequirement } from '../entities/process-requirement.entity';

/**
 * Interview Session Repository Interface
 * Handles persistence and retrieval of interview sessions
 * Based on ai_agent_class_diagram.md specification
 */
export interface InterviewSessionRepository {
  /**
   * Save a new or updated interview session
   */
  save(session: InterviewSession): Promise<InterviewSession>;

  /**
   * Find interview session by session ID
   */
  findById(sessionId: string): Promise<InterviewSession | null>;

  /**
   * Find all sessions for a specific user
   */
  findByUserId(userId: number): Promise<InterviewSession[]>;

  /**
   * Find active sessions for a specific user
   */
  findActiveByUserId(userId: number): Promise<InterviewSession[]>;

  /**
   * Find expired sessions for cleanup
   */
  findExpiredSessions(): Promise<InterviewSession[]>;

  /**
   * Update conversation messages for a session
   */
  updateConversation(
    sessionId: string, 
    conversation: ConversationMessage[]
  ): Promise<void>;

  /**
   * Update extracted requirements for a session
   */
  updateRequirements(
    sessionId: string, 
    requirements: ProcessRequirement[]
  ): Promise<void>;

  /**
   * Update generated template for a session
   * @param template - TemplateRecommendation object (type to be defined in Week 3)
   */
  updateGeneratedTemplate(
    sessionId: string, 
    template: any
  ): Promise<void>;

  /**
   * Mark session as completed
   */
  markAsCompleted(sessionId: string): Promise<void>;

  /**
   * Mark session as expired
   */
  markAsExpired(sessionId: string): Promise<void>;

  /**
   * Delete a session
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Delete all expired sessions (cleanup)
   * @returns Number of deleted sessions
   */
  deleteExpiredSessions(): Promise<number>;
}