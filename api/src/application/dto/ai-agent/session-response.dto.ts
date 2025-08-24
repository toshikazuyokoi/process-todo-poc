import { ApiProperty } from '@nestjs/swagger';
import { ConversationMessageDto, ProcessRequirement } from '../../../domain/ai-agent/types';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Session status',
    enum: ['active', 'completed', 'expired', 'cancelled'],
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Session context information',
  })
  context: {
    industry: string;
    processType: string;
    goal: string;
    additionalContext?: Record<string, any>;
  };

  @ApiProperty({
    description: 'Conversation history',
    type: 'array',
  })
  conversation: ConversationMessageDto[];

  @ApiProperty({
    description: 'Extracted requirements',
    type: 'array',
  })
  requirements: ProcessRequirement[];

  @ApiProperty({
    description: 'Generated template ID if available',
    required: false,
  })
  generatedTemplateId?: string;

  @ApiProperty({
    description: 'Session expiration time',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Session creation time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update time',
  })
  updatedAt: Date;
}