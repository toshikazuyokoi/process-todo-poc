import { IsNotEmpty, IsString, IsOptional, IsObject, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty({
    description: 'Industry or business domain',
    example: 'software_development',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  industry: string;

  @ApiProperty({
    description: 'Type of process to create',
    example: 'project_management',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  processType: string;

  @ApiProperty({
    description: 'Goal or objective for the process template',
    example: 'Create a software release process with quality gates',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  goal: string;

  @ApiPropertyOptional({
    description: 'Additional context for the AI agent',
    example: { teamSize: 10, duration: '3 months', budget: 100000 },
  })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

export class StartSessionInput {
  userId: number;
  industry: string;
  processType: string;
  goal: string;
  additionalContext?: Record<string, any>;
}

export class StartSessionOutput {
  sessionId: string;
  status: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  expiresAt: Date;
  createdAt: Date;
}