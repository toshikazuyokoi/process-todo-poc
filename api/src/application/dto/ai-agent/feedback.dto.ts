import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FeedbackType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  SUGGESTION = 'suggestion',
}

export enum FeedbackCategory {
  RESPONSE_QUALITY = 'response_quality',
  RESPONSE_SPEED = 'response_speed',
  UNDERSTANDING = 'understanding',
  HELPFULNESS = 'helpfulness',
  TEMPLATE_QUALITY = 'template_quality',
  OTHER = 'other',
}

export class SubmitFeedbackDto {
  @ApiProperty({
    description: 'Session ID associated with the feedback',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Type of feedback',
    enum: FeedbackType,
    example: FeedbackType.POSITIVE,
  })
  @IsNotEmpty()
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({
    description: 'Category of feedback',
    enum: FeedbackCategory,
    example: FeedbackCategory.RESPONSE_QUALITY,
  })
  @IsNotEmpty()
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @ApiProperty({
    description: 'Rating score from 1 to 5',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Detailed feedback message',
    example: 'The AI understood my requirements well and provided helpful suggestions',
    maxLength: 1000,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for the feedback',
    example: { 
      conversationTurn: 5,
      requirementsExtracted: 3,
      templateGenerated: false,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class FeedbackResponseDto {
  @ApiProperty({
    description: 'Feedback ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  feedbackId: string;

  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'User ID who submitted the feedback',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Type of feedback',
    enum: FeedbackType,
    example: FeedbackType.POSITIVE,
  })
  type: FeedbackType;

  @ApiProperty({
    description: 'Category of feedback',
    enum: FeedbackCategory,
    example: FeedbackCategory.RESPONSE_QUALITY,
  })
  category: FeedbackCategory;

  @ApiProperty({
    description: 'Rating score',
    example: 4,
  })
  rating: number;

  @ApiProperty({
    description: 'Feedback message',
    example: 'The AI understood my requirements well',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Metadata',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when feedback was submitted',
    example: '2024-01-01T00:00:00Z',
  })
  submittedAt: Date;

  @ApiProperty({
    description: 'Whether the feedback has been processed',
    example: false,
  })
  processed: boolean;
}

export class FeedbackInput {
  sessionId: string;
  userId: number;
  type: FeedbackType;
  category: FeedbackCategory;
  rating: number;
  message: string;
  metadata?: Record<string, any>;
}

export class FeedbackOutput {
  feedbackId: string;
  sessionId: string;
  userId: number;
  type: FeedbackType;
  category: FeedbackCategory;
  rating: number;
  message: string;
  metadata?: Record<string, any>;
  submittedAt: Date;
  processed: boolean;
}