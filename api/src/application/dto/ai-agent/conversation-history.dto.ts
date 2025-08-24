import { ApiProperty } from '@nestjs/swagger';
import { ConversationMessageDto } from '../../../domain/ai-agent/types';

export class ConversationHistoryDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'session-123',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Conversation messages',
    type: 'array',
  })
  messages: ConversationMessageDto[];

  @ApiProperty({
    description: 'Total number of messages',
    example: 10,
  })
  totalMessages: number;

  @ApiProperty({
    description: 'Conversation start time',
  })
  startedAt: Date;

  @ApiProperty({
    description: 'Last message time',
  })
  lastMessageAt: Date;
}