import { ApiProperty } from '@nestjs/swagger';

export class AIResponseDto {
  @ApiProperty({
    description: 'AI response message',
    example: 'I understand your requirements. Let me help you with that.',
  })
  message: string;

  @ApiProperty({
    description: 'Whether requirements were extracted',
    example: false,
  })
  requirementsExtracted: boolean;

  @ApiProperty({
    description: 'Current session status',
    enum: ['active', 'completed', 'expired', 'cancelled', 'paused'],
    example: 'active',
  })
  sessionStatus: string;

  @ApiProperty({
    description: 'Response metadata',
    required: false,
  })
  metadata?: Record<string, any>;
}