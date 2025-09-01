import { MessageRole } from '../enums/message-role.enum';
import { MessageContent } from '../value-objects/message-content.vo';
import { ConfidenceScore } from '../value-objects/confidence-score.vo';

/**
 * Message Metadata
 */
export interface MessageMetadata {
  intent?: string;
  entities?: Record<string, any>;
  confidence?: ConfidenceScore;
  tokenCount?: number;
}

/**
 * Conversation Message Entity
 * Represents a single message in an AI conversation
 */
export class ConversationMessage {
  private readonly id: string;
  private readonly role: MessageRole;
  private readonly content: MessageContent;
  private readonly timestamp: Date;
  private readonly metadata?: MessageMetadata;

  constructor(params: {
    id: string;
    role: MessageRole;
    content: MessageContent | string;
    timestamp?: Date;
    metadata?: MessageMetadata;
  }) {
    this.id = params.id;
    this.role = params.role;
    this.content = params.content instanceof MessageContent 
      ? params.content 
      : new MessageContent(params.content);
    this.timestamp = params.timestamp || new Date();
    this.metadata = params.metadata;

    this.validate();
  }

  /**
   * Validate message invariants
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('Message ID is required');
    }

    if (!this.role) {
      throw new Error('Message role is required');
    }

    if (!this.content) {
      throw new Error('Message content is required');
    }
  }

  /**
   * Get message ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get message role
   */
  getRole(): MessageRole {
    return this.role;
  }

  /**
   * Get message content
   */
  getContent(): MessageContent {
    return this.content;
  }

  /**
   * Get content as string
   */
  getContentText(): string {
    return this.content.getValue();
  }

  /**
   * Get timestamp
   */
  getTimestamp(): Date {
    return this.timestamp;
  }

  /**
   * Get metadata
   */
  getMetadata(): MessageMetadata | undefined {
    return this.metadata;
  }

  /**
   * Check if message is from user
   */
  isUserMessage(): boolean {
    return this.role === MessageRole.USER;
  }

  /**
   * Check if message is from assistant
   */
  isAssistantMessage(): boolean {
    return this.role === MessageRole.ASSISTANT;
  }

  /**
   * Check if message is system message
   */
  isSystemMessage(): boolean {
    return this.role === MessageRole.SYSTEM;
  }

  /**
   * Get message age in milliseconds
   */
  getAge(): number {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * Get token count from metadata
   */
  getTokenCount(): number {
    return this.metadata?.tokenCount || 0;
  }

  /**
   * Get confidence score from metadata
   */
  getConfidence(): ConfidenceScore | undefined {
    return this.metadata?.confidence;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      role: this.role,
      content: this.content.getValue(),
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata ? {
        ...this.metadata,
        confidence: this.metadata.confidence 
          ? (typeof this.metadata.confidence === 'object' && 'getValue' in this.metadata.confidence 
            ? this.metadata.confidence.getValue() 
            : this.metadata.confidence)
          : undefined,
      } : undefined,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: Record<string, any>): ConversationMessage {
    return new ConversationMessage({
      id: data.id,
      role: data.role,
      content: new MessageContent(data.content),
      timestamp: new Date(data.timestamp),
      metadata: data.metadata ? {
        ...data.metadata,
        confidence: data.metadata.confidence 
          ? ConfidenceScore.from(data.metadata.confidence)
          : undefined,
      } : undefined,
    });
  }

  /**
   * Create user message
   */
  static createUserMessage(id: string, content: string, metadata?: MessageMetadata): ConversationMessage {
    return new ConversationMessage({
      id,
      role: MessageRole.USER,
      content,
      metadata,
    });
  }

  /**
   * Create assistant message
   */
  static createAssistantMessage(id: string, content: string, metadata?: MessageMetadata): ConversationMessage {
    return new ConversationMessage({
      id,
      role: MessageRole.ASSISTANT,
      content,
      metadata,
    });
  }

  /**
   * Create system message
   */
  static createSystemMessage(id: string, content: string, metadata?: MessageMetadata): ConversationMessage {
    return new ConversationMessage({
      id,
      role: MessageRole.SYSTEM,
      content,
      metadata,
    });
  }
}