import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Process Phase DTO
 * Represents a phase in a process type
 */
export class ProcessPhaseDto {
  @ApiProperty({
    description: 'Phase name',
    example: 'Requirements Analysis',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Phase description',
    example: 'Gather and analyze all requirements from stakeholders',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Typical duration in hours',
    example: 40,
    minimum: 1,
    maximum: 2000,
  })
  @IsNumber()
  @Min(1)
  @Max(2000)
  typicalDuration: number;

  @ApiProperty({
    description: 'Required roles for this phase',
    example: ['Business Analyst', 'Product Owner'],
    type: [String],
  })
  @IsString({ each: true })
  requiredRoles: string[];

  @ApiProperty({
    description: 'Deliverables for this phase',
    example: ['Requirements Document', 'Use Cases'],
    type: [String],
  })
  @IsString({ each: true })
  deliverables: string[];

  @ApiProperty({
    description: 'Dependencies on other phases',
    example: ['Project Initiation'],
    type: [String],
  })
  @IsString({ each: true })
  dependencies: string[];

  @ApiProperty({
    description: 'Whether this phase can be parallelized',
    example: false,
  })
  @IsBoolean()
  parallelizable: boolean;
}

/**
 * Best Practice DTO
 * Represents a best practice in the knowledge base
 */
export class BestPracticeDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'bp-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Best practice title',
    example: 'Continuous Integration Setup',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Best practice description',
    example: 'Implement automated builds and tests for every code commit',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Category of the best practice',
    example: 'methodology',
    enum: ['methodology', 'tool', 'process', 'governance', 'quality'],
  })
  @IsString()
  category: string;

  @ApiPropertyOptional({
    description: 'Industry relevance',
    example: 'software',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Process type relevance',
    example: 'development',
  })
  @IsOptional()
  @IsString()
  processType?: string;

  @ApiProperty({
    description: 'Associated tags',
    example: ['ci/cd', 'automation', 'quality'],
    type: [String],
  })
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    description: 'Confidence score',
    example: 0.9,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: 'Source of the best practice',
    example: 'Industry Standard',
  })
  @IsString()
  source: string;

  @ApiPropertyOptional({
    description: 'Reference URL',
    example: 'https://example.com/best-practices/ci',
  })
  @IsOptional()
  @IsString()
  url?: string;
}

/**
 * Knowledge Base Query DTO
 * Common query parameters for knowledge base endpoints
 */
export class KnowledgeBaseQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by industry',
    example: 'software',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Filter by process type',
    example: 'development',
  })
  @IsOptional()
  @IsString()
  processType?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum confidence score',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}