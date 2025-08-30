import { IsString, IsNumber, IsEnum, IsOptional, ValidateNested, IsObject, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateGenerationStage } from '../../events/ai-template.events';

/**
 * Template Progress DTO
 */
export class WsTemplateProgressDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ enum: TemplateGenerationStage, description: 'Generation stage' })
  @IsEnum(TemplateGenerationStage)
  stage: TemplateGenerationStage;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @IsNumber()
  progress: number;

  @ApiProperty({ description: 'Progress message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Estimated time remaining in seconds' })
  @IsOptional()
  @IsNumber()
  estimatedTimeRemaining?: number;

  @ApiPropertyOptional({ 
    description: 'Progress details',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  details?: {
    stepsCompleted?: number;
    totalSteps?: number;
    currentStep?: string;
  };

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

/**
 * Template Preview Data
 */
class TemplatePreviewData {
  @ApiProperty({ description: 'Template title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Number of steps' })
  @IsNumber()
  stepCount: number;

  @ApiProperty({ description: 'Estimated duration in days' })
  @IsNumber()
  estimatedDuration: number;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: 'Template highlights', type: [String] })
  @IsArray()
  @IsString({ each: true })
  highlights: string[];
}

/**
 * Template Preview DTO
 */
export class WsTemplatePreviewDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Template ID' })
  @IsString()
  templateId: string;

  @ApiProperty({ type: TemplatePreviewData, description: 'Template preview data' })
  @ValidateNested()
  @Type(() => TemplatePreviewData)
  preview: TemplatePreviewData;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

/**
 * Template Completed DTO
 */
export class WsTemplateCompletedDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Template ID' })
  @IsString()
  templateId: string;

  @ApiProperty({ 
    description: 'Generated template',
    type: 'object'
  })
  @IsObject()
  template: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      name: string;
      description: string;
      duration: number;
      dependencies: string[];
      artifacts?: string[];
    }>;
    metadata: {
      generatedAt: Date;
      generationTime: number;
      confidence: number;
      sources: string[];
    };
  };

  @ApiProperty({ 
    description: 'Generation statistics',
    type: 'object'
  })
  @IsObject()
  statistics: {
    stepsGenerated: number;
    researchSourcesUsed: number;
    requirementsIncorporated: number;
    estimatedProjectDuration: number;
  };

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

/**
 * Template Failed DTO
 */
export class WsTemplateFailedDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ enum: TemplateGenerationStage, description: 'Stage where failure occurred' })
  @IsEnum(TemplateGenerationStage)
  stage: TemplateGenerationStage;

  @ApiProperty({ 
    description: 'Error information',
    type: 'object'
  })
  @IsObject()
  error: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({ description: 'Whether generation can be retried' })
  @IsBoolean()
  canRetry: boolean;

  @ApiPropertyOptional({ description: 'Partial result if available' })
  @IsOptional()
  partialResult?: any;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

/**
 * Generate Template Request DTO
 */
export class WsGenerateTemplateDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ 
    description: 'Generation options',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  options?: {
    includeResearch?: boolean;
    maxSteps?: number;
    targetDuration?: number;
  };
}

/**
 * Cancel Template Generation DTO
 */
export class WsCancelTemplateDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Approve Template DTO
 */
export class WsApproveTemplateDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Template ID' })
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: 'Template modifications' })
  @IsOptional()
  modifications?: any;
}