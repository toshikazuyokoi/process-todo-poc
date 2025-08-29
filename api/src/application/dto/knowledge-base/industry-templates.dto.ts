import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { KnowledgeBaseQueryDto } from './knowledge-base-common.dto';

/**
 * Industry Template DTO
 * Represents an industry-specific template in the knowledge base
 */
export class IndustryTemplateDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'ind-software-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Industry name',
    example: 'Software Development',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Common processes in this industry',
    example: ['Product Development', 'Quality Assurance', 'Release Management'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  commonProcesses: string[];

  @ApiProperty({
    description: 'Typical stakeholders in this industry',
    example: ['Product Owner', 'Development Team', 'QA Team', 'DevOps'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  typicalStakeholders: string[];

  @ApiProperty({
    description: 'Regulatory requirements for this industry',
    example: ['GDPR', 'SOC 2', 'ISO 27001'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  regulatoryRequirements: string[];

  @ApiProperty({
    description: 'Standard durations for common processes (in hours)',
    example: { 'Sprint Planning': 4, 'Code Review': 2, 'Deployment': 1 },
    type: 'object',
  })
  @IsObject()
  standardDurations: Record<string, number>;
}

/**
 * Get Industry Templates Query DTO
 * Query parameters for retrieving industry templates
 */
export class GetIndustryTemplatesQueryDto extends KnowledgeBaseQueryDto {
  @ApiPropertyOptional({
    description: 'Search query for industry name',
    example: 'software',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by regulatory requirement',
    example: 'GDPR',
  })
  @IsOptional()
  @IsString()
  regulation?: string;

  @ApiPropertyOptional({
    description: 'Filter by common process',
    example: 'Product Development',
  })
  @IsOptional()
  @IsString()
  process?: string;
}

/**
 * Industry Templates Response DTO
 * Response containing industry templates
 */
export class IndustryTemplatesResponseDto {
  @ApiProperty({
    description: 'List of industry templates',
    type: [IndustryTemplateDto],
  })
  @ValidateNested({ each: true })
  @Type(() => IndustryTemplateDto)
  templates: IndustryTemplateDto[];

  @ApiProperty({
    description: 'Total number of templates available',
    example: 15,
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
}

/**
 * Create Industry Template DTO
 * DTO for creating a new industry template
 */
export class CreateIndustryTemplateDto {
  @ApiProperty({
    description: 'Industry name',
    example: 'Healthcare',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Common processes in this industry',
    example: ['Patient Care', 'Medical Records', 'Compliance'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  commonProcesses: string[];

  @ApiProperty({
    description: 'Typical stakeholders in this industry',
    example: ['Doctors', 'Nurses', 'Administrators', 'Patients'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  typicalStakeholders: string[];

  @ApiProperty({
    description: 'Regulatory requirements for this industry',
    example: ['HIPAA', 'FDA Compliance'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  regulatoryRequirements: string[];

  @ApiPropertyOptional({
    description: 'Standard durations for common processes (in hours)',
    example: { 'Patient Consultation': 1, 'Medical Procedure': 3 },
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  standardDurations?: Record<string, number>;
}

/**
 * Update Industry Template DTO
 * DTO for updating an existing industry template
 */
export class UpdateIndustryTemplateDto {
  @ApiPropertyOptional({
    description: 'Industry name',
    example: 'Healthcare',
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Common processes in this industry',
    example: ['Patient Care', 'Medical Records', 'Compliance'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonProcesses?: string[];

  @ApiPropertyOptional({
    description: 'Typical stakeholders in this industry',
    example: ['Doctors', 'Nurses', 'Administrators', 'Patients'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typicalStakeholders?: string[];

  @ApiPropertyOptional({
    description: 'Regulatory requirements for this industry',
    example: ['HIPAA', 'FDA Compliance'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regulatoryRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Standard durations for common processes (in hours)',
    example: { 'Patient Consultation': 1, 'Medical Procedure': 3 },
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  standardDurations?: Record<string, number>;
}