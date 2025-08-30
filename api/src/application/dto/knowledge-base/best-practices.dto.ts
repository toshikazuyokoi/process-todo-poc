import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { KnowledgeBaseQueryDto, BestPracticeDto as BestPracticeDtoClass } from './knowledge-base-common.dto';

// Re-export BestPracticeDto from common DTOs
export { BestPracticeDto } from './knowledge-base-common.dto';

/**
 * Get Best Practices Query DTO
 * Query parameters for retrieving best practices from knowledge base
 */
export class GetBestPracticesQueryDto extends KnowledgeBaseQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'methodology',
    enum: ['methodology', 'tool', 'process', 'governance', 'quality'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Search query for best practice title or description',
    example: 'continuous integration',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: ['agile', 'automation'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by source',
    example: 'Industry Standard',
  })
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * Best Practices Response DTO
 * Response containing best practices from knowledge base
 */
export class BestPracticesResponseDto {
  @ApiProperty({
    description: 'List of best practices',
    type: [BestPracticeDtoClass],
  })
  @ValidateNested({ each: true })
  @Type(() => BestPracticeDtoClass)
  bestPractices: BestPracticeDtoClass[];

  @ApiProperty({
    description: 'Total number of best practices available',
    example: 50,
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
    example: ['methodology', 'tool', 'process'],
    type: [String],
  })
  availableCategories?: string[];

  @ApiPropertyOptional({
    description: 'Popular tags',
    example: ['agile', 'scrum', 'automation', 'testing'],
    type: [String],
  })
  popularTags?: string[];
}

/**
 * Create Best Practice DTO
 * DTO for creating a new best practice
 */
export class CreateBestPracticeDto {
  @ApiProperty({
    description: 'Best practice title',
    example: 'Daily Standup Meetings',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Best practice description',
    example: 'Conduct brief daily meetings to synchronize team activities',
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
    example: ['agile', 'scrum', 'communication'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    description: 'Confidence score',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: 'Source of the best practice',
    example: 'Scrum Guide',
  })
  @IsString()
  source: string;

  @ApiPropertyOptional({
    description: 'Reference URL',
    example: 'https://scrumguides.org',
  })
  @IsOptional()
  @IsString()
  url?: string;
}

/**
 * Update Best Practice DTO
 * DTO for updating an existing best practice
 */
export class UpdateBestPracticeDto {
  @ApiPropertyOptional({
    description: 'Best practice title',
    example: 'Daily Standup Meetings',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Best practice description',
    example: 'Conduct brief daily meetings to synchronize team activities',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category of the best practice',
    example: 'methodology',
    enum: ['methodology', 'tool', 'process', 'governance', 'quality'],
  })
  @IsOptional()
  @IsString()
  category?: string;

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

  @ApiPropertyOptional({
    description: 'Associated tags',
    example: ['agile', 'scrum', 'communication'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Confidence score',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Source of the best practice',
    example: 'Scrum Guide',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Reference URL',
    example: 'https://scrumguides.org',
  })
  @IsOptional()
  @IsString()
  url?: string;
}

/**
 * Bulk Update Best Practices DTO
 * DTO for updating confidence scores of multiple best practices
 */
export class BulkUpdateBestPracticesDto {
  @ApiProperty({
    description: 'Updates to apply',
    type: 'array',
    example: [
      { id: 'bp-001', confidence: 0.95 },
      { id: 'bp-002', confidence: 0.80 }
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => BestPracticeUpdateDto)
  updates: BestPracticeUpdateDto[];
}

/**
 * Best Practice Update DTO
 * Single update entry for bulk operations
 */
class BestPracticeUpdateDto {
  @ApiProperty({
    description: 'Best practice ID',
    example: 'bp-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'New confidence score',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

/**
 * Bulk Update Result DTO
 * Result of bulk update operations on best practices
 */
export class BulkUpdateResultDto {
  @ApiProperty({
    description: 'Total number of successfully updated items',
    example: 8,
  })
  @IsNumber()
  totalUpdated: number;

  @ApiProperty({
    description: 'IDs of successfully updated items',
    type: [String],
    example: ['bp-001', 'bp-002', 'bp-003'],
  })
  @IsArray()
  @IsString({ each: true })
  updatedIds: string[];

  @ApiProperty({
    description: 'Failed updates with error details',
    type: [Object],
    required: false,
    example: [
      { id: 'bp-004', error: 'Not found' },
      { id: 'bp-005', error: 'Validation failed' }
    ],
  })
  @IsArray()
  @IsOptional()
  failures?: Array<{
    id: string;
    error: string;
  }>;
}