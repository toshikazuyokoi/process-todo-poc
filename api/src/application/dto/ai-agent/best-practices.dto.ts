import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplexityLevel } from '../../../domain/ai-agent/entities/process-analysis.entity';

/**
 * Best Practice Search Filter DTO
 */
export class BestPracticeFilterDto {
  @ApiPropertyOptional({
    description: 'Industry filter',
    example: 'software',
    enum: ['software', 'healthcare', 'finance', 'manufacturing', 'retail', 'general'],
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Process type filter',
    example: 'development',
  })
  @IsOptional()
  @IsString()
  processType?: string;

  @ApiPropertyOptional({
    description: 'Complexity filter',
    enum: Object.values(ComplexityLevel),
    example: ComplexityLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexity?: ComplexityLevel;

  @ApiPropertyOptional({
    description: 'Tags to filter by',
    example: ['agile', 'scrum'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Search Best Practices Request DTO
 */
export class SearchBestPracticesDto {
  @ApiProperty({
    description: 'Search query',
    example: 'agile project management',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Search filters',
    type: BestPracticeFilterDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BestPracticeFilterDto)
  filters?: BestPracticeFilterDto;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Best Practice Result DTO
 */
export class BestPracticeResultDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'bp-123456',
  })
  id: string;

  @ApiProperty({
    description: 'Title of the best practice',
    example: 'Implementing Agile Sprint Planning',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed description',
    example: 'A comprehensive guide to effective sprint planning in agile teams',
  })
  description: string;

  @ApiProperty({
    description: 'Source of the best practice',
    enum: ['knowledge_base', 'web_research', 'community'],
    example: 'knowledge_base',
  })
  source: 'knowledge_base' | 'web_research' | 'community';

  @ApiProperty({
    description: 'Relevance score',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  relevance: number;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'software',
  })
  industry?: string;

  @ApiPropertyOptional({
    description: 'Process type',
    example: 'development',
  })
  processType?: string;

  @ApiPropertyOptional({
    description: 'Complexity level',
    enum: Object.values(ComplexityLevel),
    example: ComplexityLevel.MEDIUM,
  })
  complexity?: ComplexityLevel;

  @ApiPropertyOptional({
    description: 'Associated tags',
    example: ['agile', 'scrum', 'planning'],
    type: [String],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'External URL',
    example: 'https://example.com/best-practices/agile',
  })
  url?: string;

  @ApiPropertyOptional({
    description: 'Publication date',
    example: '2024-01-15T10:30:00Z',
  })
  publishedAt?: Date;

  @ApiPropertyOptional({
    description: 'Author name',
    example: 'John Smith',
  })
  author?: string;

  @ApiPropertyOptional({
    description: 'Number of citations',
    example: 42,
  })
  citations?: number;
}

/**
 * Search Best Practices Response DTO
 */
export class SearchBestPracticesResponseDto {
  @ApiProperty({
    description: 'Original search query',
    example: 'agile project management',
  })
  query: string;

  @ApiProperty({
    description: 'List of best practice results',
    type: [BestPracticeResultDto],
  })
  results: BestPracticeResultDto[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 25,
  })
  totalResults: number;

  @ApiProperty({
    description: 'Search timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  searchedAt: Date;

  @ApiProperty({
    description: 'Applied filters',
    type: BestPracticeFilterDto,
  })
  filters: BestPracticeFilterDto;
}