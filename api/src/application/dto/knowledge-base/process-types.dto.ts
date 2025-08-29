import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { KnowledgeBaseQueryDto, ProcessPhaseDto } from './knowledge-base-common.dto';

/**
 * Process Type Template DTO
 * Represents a process type template in the knowledge base
 */
export class ProcessTypeTemplateDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'proc-dev-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Process type name',
    example: 'Agile Software Development',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Process category',
    example: 'development',
    enum: ['development', 'marketing', 'sales', 'operations', 'hr', 'finance', 'legal', 'procurement', 'manufacturing', 'quality_assurance', 'customer_service', 'research'],
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Process phases',
    type: [ProcessPhaseDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ProcessPhaseDto)
  phases: ProcessPhaseDto[];

  @ApiProperty({
    description: 'Common deliverables for this process type',
    example: ['Product Backlog', 'Sprint Plan', 'Working Software'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  commonDeliverables: string[];

  @ApiProperty({
    description: 'Risk factors associated with this process type',
    example: ['Scope Creep', 'Technical Debt', 'Resource Availability'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  riskFactors: string[];
}

/**
 * Get Process Types Query DTO
 * Query parameters for retrieving process types
 */
export class GetProcessTypesQueryDto extends KnowledgeBaseQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'development',
    enum: ['development', 'marketing', 'sales', 'operations', 'hr', 'finance', 'legal', 'procurement', 'manufacturing', 'quality_assurance', 'customer_service', 'research'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Search query for process type name',
    example: 'agile',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by deliverable',
    example: 'Product Backlog',
  })
  @IsOptional()
  @IsString()
  deliverable?: string;

  @ApiPropertyOptional({
    description: 'Include process types with specific phase',
    example: 'Planning',
  })
  @IsOptional()
  @IsString()
  hasPhase?: string;
}

/**
 * Process Types Response DTO
 * Response containing process types
 */
export class ProcessTypesResponseDto {
  @ApiProperty({
    description: 'List of process type templates',
    type: [ProcessTypeTemplateDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ProcessTypeTemplateDto)
  processTypes: ProcessTypeTemplateDto[];

  @ApiProperty({
    description: 'Total number of process types available',
    example: 25,
  })
  total: number;

  @ApiPropertyOptional({
    description: 'Current offset for pagination',
    example: 0,
  })
  offset?: number;

  @ApiPropertyOptional({
    description: 'Current limit for pagination',
    example: 20,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Available categories',
    example: ['development', 'marketing', 'sales'],
    type: [String],
  })
  availableCategories?: string[];
}

/**
 * Create Process Type DTO
 * DTO for creating a new process type
 */
export class CreateProcessTypeDto {
  @ApiProperty({
    description: 'Process type name',
    example: 'Waterfall Development',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Process category',
    example: 'development',
    enum: ['development', 'marketing', 'sales', 'operations', 'hr', 'finance', 'legal', 'procurement', 'manufacturing', 'quality_assurance', 'customer_service', 'research'],
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Process phases',
    type: [ProcessPhaseDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ProcessPhaseDto)
  phases: ProcessPhaseDto[];

  @ApiProperty({
    description: 'Common deliverables for this process type',
    example: ['Requirements Document', 'Design Document', 'Test Plan'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  commonDeliverables: string[];

  @ApiPropertyOptional({
    description: 'Risk factors associated with this process type',
    example: ['Requirements Changes', 'Integration Issues'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskFactors?: string[];
}

/**
 * Update Process Type DTO
 * DTO for updating an existing process type
 */
export class UpdateProcessTypeDto {
  @ApiPropertyOptional({
    description: 'Process type name',
    example: 'Waterfall Development',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Process category',
    example: 'development',
    enum: ['development', 'marketing', 'sales', 'operations', 'hr', 'finance', 'legal', 'procurement', 'manufacturing', 'quality_assurance', 'customer_service', 'research'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Process phases',
    type: [ProcessPhaseDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProcessPhaseDto)
  phases?: ProcessPhaseDto[];

  @ApiPropertyOptional({
    description: 'Common deliverables for this process type',
    example: ['Requirements Document', 'Design Document', 'Test Plan'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonDeliverables?: string[];

  @ApiPropertyOptional({
    description: 'Risk factors associated with this process type',
    example: ['Requirements Changes', 'Integration Issues'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskFactors?: string[];
}