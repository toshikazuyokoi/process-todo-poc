import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, ValidateNested, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplexityLevel } from '../../../domain/ai-agent/entities/process-analysis.entity';

/**
 * Step Recommendation DTO
 * Represents a single step in a process template
 */
export class StepRecommendationDto {
  @ApiProperty({
    description: 'Unique identifier for the step',
    example: 'step-001',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Name of the step',
    example: 'Requirements Gathering',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the step',
    example: 'Collect and document all functional and non-functional requirements',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Estimated duration in hours',
    example: 16,
    minimum: 1,
    maximum: 480,
  })
  @IsNumber()
  @Min(1)
  @Max(480)
  duration: number;

  @ApiProperty({
    description: 'List of step IDs this step depends on',
    example: ['step-000'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  dependencies: string[];

  @ApiProperty({
    description: 'List of artifacts produced by this step',
    example: ['Requirements Document', 'User Stories'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  artifacts: string[];

  @ApiProperty({
    description: 'Responsible party for this step',
    example: 'Business Analyst',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  responsible: string;

  @ApiProperty({
    description: 'Whether this step is on the critical path',
    example: true,
  })
  criticalPath: boolean;
}

/**
 * Template Recommendation DTO
 * Complete template recommendation with steps and metadata
 */
export class TemplateRecommendationDto {
  @ApiProperty({
    description: 'Unique identifier for the template',
    example: 'template-123456',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Agile Software Development Process',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'A comprehensive agile development process template',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'List of process steps',
    type: [StepRecommendationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepRecommendationDto)
  steps: StepRecommendationDto[];

  @ApiProperty({
    description: 'Confidence score for this recommendation',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: 'Rationale for this recommendation',
    example: ['Based on industry best practices', 'Suitable for team size'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  rationale: string[];

  @ApiProperty({
    description: 'Total estimated duration in hours',
    example: 160,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  estimatedDuration: number;

  @ApiProperty({
    description: 'Complexity level of the template',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  @IsEnum(ComplexityLevel)
  complexity: ComplexityLevel;

  @ApiPropertyOptional({
    description: 'Alternative template recommendations',
    type: [TemplateRecommendationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateRecommendationDto)
  alternatives?: TemplateRecommendationDto[];
}

/**
 * Generate Template Request DTO
 */
export class GenerateTemplateDto {
  @ApiPropertyOptional({
    description: 'Additional preferences for template generation',
    example: { preferredDuration: 'short', includeQualityChecks: true },
  })
  @IsOptional()
  preferences?: Record<string, any>;
}

/**
 * Generate Template Response DTO
 */
export class GenerateTemplateResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'List of template recommendations',
    type: [TemplateRecommendationDto],
  })
  recommendations: TemplateRecommendationDto[];

  @ApiProperty({
    description: 'Analysis ID for tracking',
    example: 'analysis-1234567890',
  })
  analysisId: string;

  @ApiPropertyOptional({
    description: 'Background research job ID',
    example: 'job-uuid-123',
  })
  researchJobId?: string;

  @ApiProperty({
    description: 'Generation timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  generatedAt: Date;
}

/**
 * Finalize Template Request DTO
 */
export class FinalizeTemplateDto {
  @ApiProperty({
    description: 'Selected template ID',
    example: 'template-123456',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  templateId: string;

  @ApiPropertyOptional({
    description: 'User modifications to the template',
    type: TemplateRecommendationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateRecommendationDto)
  modifications?: Partial<TemplateRecommendationDto>;

  @ApiPropertyOptional({
    description: 'Additional notes or comments',
    example: 'Please adjust timeline for holiday season',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Finalize Template Response DTO
 */
export class FinalizeTemplateResponseDto {
  @ApiProperty({
    description: 'Final template ID',
    example: 'template-final-123456',
  })
  templateId: string;

  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Customized Agile Process',
  })
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'A customized agile process template',
  })
  description: string;

  @ApiProperty({
    description: 'Final list of steps',
    type: [StepRecommendationDto],
  })
  steps: StepRecommendationDto[];

  @ApiProperty({
    description: 'Additional metadata',
    example: { version: '1.0', createdBy: 'AI Agent' },
  })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Template status',
    enum: ['draft', 'finalized'],
    example: 'finalized',
  })
  status: 'draft' | 'finalized';
}