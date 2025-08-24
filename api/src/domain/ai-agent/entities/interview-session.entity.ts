import { SessionStatus } from '../enums/session-status.enum';

export { SessionStatus };
import { SessionId } from '../value-objects/session-id.vo';
import { ConversationMessage } from './conversation-message.entity';
import { ProcessRequirement } from './process-requirement.entity';

/**
 * Session Context
 */
export interface SessionContext {
  industry?: string;
  processType?: string;
  goal?: string;  // Added for compatibility
  complexity?: 'simple' | 'medium' | 'complex' | 'very_complex';
  teamSize?: number;
  duration?: string;
  compliance?: string[];
  region?: string;
  budget?: number;
  timeline?: string;
  additionalContext?: any;
}

/**
 * Generated Template
 */
export interface GeneratedTemplate {
  name: string;
  steps: Array<{
    name: string;
    description: string;
    duration: number;
    dependencies: number[];
  }>;
  metadata: {
    generatedAt: string;
    confidence: number;
    sources: string[];
  };
}

/**
 * Interview Session Entity
 * Represents an AI interview session for template creation
 */
export class InterviewSession {
  private sessionId: SessionId;
  private userId: number;
  private status: SessionStatus;
  private context: SessionContext;
  private conversation: ConversationMessage[];
  private extractedRequirements: ProcessRequirement[];
  private generatedTemplate?: GeneratedTemplate;
  private createdAt: Date;
  private updatedAt: Date;
  private expiresAt: Date;

  constructor(params: {
    sessionId: SessionId | string;
    userId: number;
    status?: SessionStatus;
    context?: SessionContext;
    conversation?: ConversationMessage[];
    extractedRequirements?: ProcessRequirement[];
    generatedTemplate?: GeneratedTemplate;
    createdAt?: Date;
    updatedAt?: Date;
    expiresAt?: Date;
  }) {
    this.sessionId = params.sessionId instanceof SessionId
      ? params.sessionId
      : new SessionId(params.sessionId);
    this.userId = params.userId;
    this.status = params.status || SessionStatus.ACTIVE;
    this.context = params.context || {};
    this.conversation = params.conversation || [];
    this.extractedRequirements = params.extractedRequirements || [];
    this.generatedTemplate = params.generatedTemplate;
    this.createdAt = params.createdAt || new Date();
    this.updatedAt = params.updatedAt || new Date();
    this.expiresAt = params.expiresAt || this.calculateExpiration();

    this.validate();
  }

  /**
   * Calculate session expiration (default: 60 minutes from now)
   */
  private calculateExpiration(minutes: number = 60): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + minutes);
    return expiration;
  }

  /**
   * Validate session invariants
   */
  private validate(): void {
    if (!this.userId || this.userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (this.expiresAt <= this.createdAt) {
      throw new Error('Expiration date must be after creation date');
    }

    if (this.isExpired() && this.status === SessionStatus.ACTIVE) {
      throw new Error('Expired session cannot be active');
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): SessionId {
    return this.sessionId;
  }

  /**
   * Get session ID as string
   */
  getSessionIdString(): string {
    return this.sessionId.getValue();
  }

  /**
   * Get user ID
   */
  getUserId(): number {
    return this.userId;
  }

  /**
   * Get session status
   */
  getStatus(): SessionStatus {
    return this.status;
  }

  /**
   * Get session context
   */
  getContext(): SessionContext {
    return { ...this.context };
  }

  /**
   * Get conversation messages
   */
  getConversation(): ConversationMessage[] {
    return [...this.conversation];
  }

  /**
   * Get extracted requirements
   */
  getExtractedRequirements(): ProcessRequirement[] {
    return [...this.extractedRequirements];
  }

  /**
   * Get generated template
   */
  getGeneratedTemplate(): GeneratedTemplate | undefined {
    return this.generatedTemplate;
  }

  /**
   * Get timestamps
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Check if session is completed
   */
  isCompleted(): boolean {
    return this.status === SessionStatus.COMPLETED;
  }

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if session can be modified
   */
  canBeModified(): boolean {
    return this.isActive() && !this.isExpired();
  }

  /**
   * Update session context
   */
  updateContext(context: Partial<SessionContext>): void {
    if (!this.canBeModified()) {
      throw new Error('Session cannot be modified in current state');
    }

    this.context = { ...this.context, ...context };
    this.updatedAt = new Date();
  }

  /**
   * Add message to conversation
   */
  addMessage(message: ConversationMessage): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot add message to inactive session');
    }

    this.conversation.push(message);
    this.updatedAt = new Date();
  }

  /**
   * Add requirement
   */
  addRequirement(requirement: ProcessRequirement): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot add requirement to inactive session');
    }

    this.extractedRequirements.push(requirement);
    this.updatedAt = new Date();
  }

  /**
   * Update requirements
   */
  updateRequirements(requirements: ProcessRequirement[]): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot update requirements in inactive session');
    }

    this.extractedRequirements = requirements;
    this.updatedAt = new Date();
  }

  /**
   * Set generated template
   */
  setGeneratedTemplate(template: GeneratedTemplate): void {
    if (!this.canBeModified()) {
      throw new Error('Cannot set template in inactive session');
    }

    this.generatedTemplate = template;
    this.updatedAt = new Date();
  }

  /**
   * Complete session
   */
  complete(): void {
    if (!this.isActive()) {
      throw new Error('Only active sessions can be completed');
    }

    this.status = SessionStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * Pause session
   */
  pause(): void {
    if (!this.isActive()) {
      throw new Error('Only active sessions can be paused');
    }

    this.status = SessionStatus.PAUSED;
    this.updatedAt = new Date();
  }

  /**
   * Resume session
   */
  resume(): void {
    if (this.status !== SessionStatus.PAUSED) {
      throw new Error('Only paused sessions can be resumed');
    }

    if (this.isExpired()) {
      throw new Error('Cannot resume expired session');
    }

    this.status = SessionStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Cancel session
   */
  cancel(): void {
    if (this.isCompleted()) {
      throw new Error('Cannot cancel completed session');
    }

    this.status = SessionStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  /**
   * Expire session
   */
  expire(): void {
    if (this.isCompleted()) {
      throw new Error('Cannot expire completed session');
    }

    this.status = SessionStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  /**
   * Extend session expiration
   */
  extendExpiration(minutes: number): void {
    if (!this.isActive()) {
      throw new Error('Only active sessions can be extended');
    }

    const newExpiration = new Date(this.expiresAt);
    newExpiration.setMinutes(newExpiration.getMinutes() + minutes);
    
    this.expiresAt = newExpiration;
    this.updatedAt = new Date();
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.conversation.length;
  }

  /**
   * Get requirement count
   */
  getRequirementCount(): number {
    return this.extractedRequirements.length;
  }

  /**
   * Get last message
   */
  getLastMessage(): ConversationMessage | undefined {
    return this.conversation[this.conversation.length - 1];
  }

  /**
   * Get session duration in milliseconds
   */
  getDuration(): number {
    return this.updatedAt.getTime() - this.createdAt.getTime();
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      sessionId: this.sessionId.getValue(),
      userId: this.userId,
      status: this.status,
      context: this.context,
      conversation: this.conversation.map(m => m.toJSON()),
      extractedRequirements: this.extractedRequirements.map(r => r.toJSON()),
      generatedTemplate: this.generatedTemplate,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: Record<string, any>): InterviewSession {
    return new InterviewSession({
      sessionId: data.sessionId,
      userId: data.userId,
      status: data.status,
      context: data.context,
      conversation: data.conversation?.map((m: any) => ConversationMessage.fromJSON(m)),
      extractedRequirements: data.extractedRequirements?.map((r: any) => ProcessRequirement.fromJSON(r)),
      generatedTemplate: data.generatedTemplate,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }
}