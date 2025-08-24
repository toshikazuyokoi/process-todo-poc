import { ConversationMessage } from '../entities/conversation-message.entity';
import { ConversationMessageDto } from '../types';
import { MessageRole } from '../enums/message-role.enum';
import { MessageContent } from '../value-objects/message-content.vo';
import { ConfidenceScore } from '../value-objects/confidence-score.vo';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mapper for converting between ConversationMessage entity and DTO
 */
export class ConversationMessageMapper {
  /**
   * Convert DTO to Entity
   */
  static toEntity(dto: ConversationMessageDto, id?: string): ConversationMessage {
    const messageId = id || uuidv4();
    const role = this.mapRole(dto.role);
    
    const metadata = dto.metadata ? {
      ...dto.metadata,
      confidence: dto.metadata.confidence 
        ? ConfidenceScore.from(dto.metadata.confidence)
        : undefined,
    } : undefined;

    return new ConversationMessage({
      id: messageId,
      role,
      content: new MessageContent(dto.content),
      timestamp: dto.timestamp || new Date(),
      metadata,
    });
  }

  /**
   * Convert Entity to DTO
   */
  static toDto(entity: ConversationMessage): ConversationMessageDto {
    const metadata = entity.getMetadata();
    
    return {
      role: this.mapRoleToString(entity.getRole()),
      content: entity.getContentText(),
      timestamp: entity.getTimestamp(),
      metadata: metadata ? {
        ...metadata,
        confidence: metadata.confidence?.getValue(),
      } : undefined,
    };
  }

  /**
   * Convert Entity array to DTO array
   */
  static toDtoArray(entities: ConversationMessage[]): ConversationMessageDto[] {
    return entities.map(entity => this.toDto(entity));
  }

  /**
   * Convert DTO array to Entity array
   */
  static toEntityArray(dtos: ConversationMessageDto[]): ConversationMessage[] {
    return dtos.map(dto => this.toEntity(dto));
  }

  /**
   * Map string role to MessageRole enum
   */
  private static mapRole(role: 'user' | 'assistant' | 'system'): MessageRole {
    switch (role) {
      case 'user':
        return MessageRole.USER;
      case 'assistant':
        return MessageRole.ASSISTANT;
      case 'system':
        return MessageRole.SYSTEM;
      default:
        throw new Error(`Invalid role: ${role}`);
    }
  }

  /**
   * Map MessageRole enum to string
   */
  private static mapRoleToString(role: MessageRole): 'user' | 'assistant' | 'system' {
    switch (role) {
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
        return 'assistant';
      case MessageRole.SYSTEM:
        return 'system';
      default:
        throw new Error(`Invalid MessageRole: ${role}`);
    }
  }

  /**
   * Create user message entity from string
   */
  static createUserMessage(content: string, metadata?: Record<string, any>): ConversationMessage {
    return ConversationMessage.createUserMessage(
      uuidv4(),
      content,
      metadata,
    );
  }

  /**
   * Create assistant message entity from string
   */
  static createAssistantMessage(
    content: string, 
    confidence?: number,
    tokenCount?: number,
    suggestedQuestions?: string[],
  ): ConversationMessage {
    const metadata: any = {};
    
    if (confidence !== undefined) {
      metadata.confidence = ConfidenceScore.from(confidence);
    }
    
    if (tokenCount !== undefined) {
      metadata.tokenCount = tokenCount;
    }
    
    if (suggestedQuestions) {
      metadata.suggestedQuestions = suggestedQuestions;
    }
    
    return ConversationMessage.createAssistantMessage(
      uuidv4(),
      content,
      Object.keys(metadata).length > 0 ? metadata : undefined,
    );
  }
}