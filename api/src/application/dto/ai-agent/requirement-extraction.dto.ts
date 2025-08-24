import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum RequirementCategory {
  FUNCTIONAL = 'functional',
  NON_FUNCTIONAL = 'non_functional',
  CONSTRAINT = 'constraint',
  STAKEHOLDER = 'stakeholder',
  DELIVERABLE = 'deliverable',
  MILESTONE = 'milestone',
  RISK = 'risk',
  DEPENDENCY = 'dependency',
  GOAL = 'goal',
}

export enum RequirementPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  CRITICAL = 'critical',
}

export class RequirementExtractionDto {
  @ApiProperty({
    description: 'Requirement category',
    enum: RequirementCategory,
  })
  @IsEnum(RequirementCategory)
  category: RequirementCategory;

  @ApiProperty({
    description: 'Requirement description',
    example: 'All code must be reviewed by at least 2 developers',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: RequirementPriority,
  })
  @IsOptional()
  @IsEnum(RequirementPriority)
  priority?: RequirementPriority;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.85,
  })
  @IsNumber()
  confidence: number;

  @ApiPropertyOptional({
    description: 'Source message or context',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Related requirements or dependencies',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export interface ExtractedRequirement {
  id?: string;
  category: RequirementCategory;
  description: string;
  priority?: RequirementPriority;
  confidence: number;
  source?: string;
  relatedRequirements?: string[];
  metadata?: Record<string, any>;
  extractedAt: Date;
}