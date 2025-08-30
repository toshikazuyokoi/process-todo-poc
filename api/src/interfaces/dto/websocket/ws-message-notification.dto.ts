import { IsString, IsBoolean, IsNumber, IsOptional, IsArray, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageRole } from '../../../domain/ai-agent/enums/message-role.enum';

/**
 * Message Notification DTO
 */
export class WsMessageNotificationDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Message ID' })
  @IsString()
  messageId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageRole, description: 'Message sender role' })
  @IsEnum(MessageRole)
  role: MessageRole;

  @ApiPropertyOptional({ description: 'Suggested follow-up questions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedQuestions?: string[];

  @ApiPropertyOptional({ description: 'Confidence score (0-1)' })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Message metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
  };

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

/**
 * Typing Indicator DTO
 */
export class WsTypingIndicatorDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Is typing status' })
  @IsBoolean()
  isTyping: boolean;

  @ApiPropertyOptional({ description: 'Estimated time in seconds' })
  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @ApiPropertyOptional({ 
    description: 'Processing stage',
    enum: ['thinking', 'researching', 'analyzing', 'generating']
  })
  @IsOptional()
  @IsString()
  stage?: 'thinking' | 'researching' | 'analyzing' | 'generating';
}

/**
 * Send Message Request DTO
 */
export class WsSendMessageDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Message metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    clientId?: string;
    timestamp?: string;
  };
}

/**
 * Requirements Extracted Notification DTO
 */
export class WsRequirementsExtractedDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ 
    description: 'Extracted requirements',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        category: { type: 'string' },
        content: { type: 'string' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        confidence: { type: 'number' },
      }
    }
  })
  @IsArray()
  requirements: Array<{
    id: string;
    category: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
    extractedFrom?: string[];
  }>;

  @ApiProperty({ description: 'Total requirements count' })
  @IsNumber()
  totalCount: number;

  @ApiProperty({ description: 'New requirements count' })
  @IsNumber()
  newCount: number;

  @ApiProperty({ description: 'Updated requirements count' })
  @IsNumber()
  updatedCount: number;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

/**
 * Message Error DTO
 */
export class WsMessageErrorDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ 
    description: 'Error information',
    type: 'object',
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
      details: { type: 'object' }
    }
  })
  @IsObject()
  error: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiPropertyOptional({ description: 'Message ID that caused the error' })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({ description: 'Original user message' })
  @IsOptional()
  @IsString()
  userMessage?: string;

  @ApiProperty({ description: 'Whether the operation can be retried' })
  @IsBoolean()
  retryable: boolean;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}