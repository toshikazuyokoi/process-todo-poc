import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Session identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'User message that was processed',
  })
  userMessage: {
    content: string;
    timestamp: Date;
  };

  @ApiProperty({
    description: 'AI agent response',
  })
  aiResponse: {
    content: string;
    suggestedQuestions?: string[];
    confidence?: number;
    timestamp: Date;
  };

  @ApiPropertyOptional({
    description: 'Requirements extracted from this message',
    type: 'array',
  })
  extractedRequirements?: Array<{
    category: string;
    description: string;
    priority?: string;
    confidence: number;
  }>;

  @ApiPropertyOptional({
    description: 'Conversation progress metrics',
  })
  conversationProgress?: {
    completeness: number;
    missingAreas?: string[];
  };

  @ApiProperty({
    description: 'Token usage for this interaction',
  })
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export class ConversationHistoryDto {
  @ApiProperty({
    description: 'Session identifier',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Complete conversation history',
    type: 'array',
  })
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @ApiProperty({
    description: 'Total number of messages',
  })
  totalMessages: number;

  @ApiProperty({
    description: 'Session start time',
  })
  startedAt: Date;

  @ApiProperty({
    description: 'Last message time',
  })
  lastMessageAt: Date;
}