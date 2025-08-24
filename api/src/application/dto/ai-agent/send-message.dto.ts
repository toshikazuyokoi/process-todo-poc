import { IsNotEmpty, IsString, IsOptional, IsObject, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'User message to the AI agent',
    example: 'We need to ensure all code is reviewed before merging',
    maxLength: 2000,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for the message',
    example: { intent: 'requirement', priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ProcessMessageInput {
  sessionId: string;
  userId: number;
  message: string;
  metadata?: Record<string, any>;
}

export class ProcessMessageOutput {
  sessionId: string;
  userMessage: {
    content: string;
    timestamp: Date;
  };
  aiResponse: {
    content: string;
    suggestedQuestions?: string[];
    confidence?: number;
    timestamp: Date;
  };
  extractedRequirements?: Array<{
    category: string;
    description: string;
    priority?: string;
    confidence: number;
  }>;
  conversationProgress?: {
    completeness: number;
    missingAreas?: string[];
  };
}