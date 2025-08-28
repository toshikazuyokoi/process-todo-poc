import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Compliance Severity Level Enum
 */
export enum ComplianceSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Compliance Source Type Enum
 */
export enum ComplianceSource {
  REGULATORY = 'regulatory',
  INDUSTRY_STANDARD = 'industry_standard',
  WEB_RESEARCH = 'web_research',
}

/**
 * Compliance Requirements Filter DTO
 */
export class ComplianceFilterDto {
  @ApiProperty({
    description: 'Industry filter (required for compliance search)',
    example: 'healthcare',
    enum: ['healthcare', 'finance', 'insurance', 'retail', 'manufacturing', 'technology', 'general'],
  })
  @IsNotEmpty()
  @IsString()
  industry: string;

  @ApiPropertyOptional({
    description: 'Region filter (ISO 3166 country code)',
    example: 'US',
    enum: ['US', 'EU', 'JP', 'UK', 'CA', 'AU', 'SG', 'GLOBAL'],
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'Compliance category',
    example: 'data-privacy',
    enum: ['data-privacy', 'security', 'audit', 'financial', 'environmental', 'labor', 'general'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Severity level filter',
    enum: Object.values(ComplianceSeverity),
    example: ComplianceSeverity.CRITICAL,
  })
  @IsOptional()
  @IsEnum(ComplianceSeverity)
  severity?: ComplianceSeverity;
}

/**
 * Search Compliance Requirements Request DTO
 */
export class SearchComplianceRequirementsDto {
  @ApiProperty({
    description: 'Search query for compliance requirements',
    example: 'data protection regulations',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Search filters (industry is required)',
    type: ComplianceFilterDto,
  })
  @ValidateNested()
  @Type(() => ComplianceFilterDto)
  filters: ComplianceFilterDto;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Compliance Requirement Result DTO
 */
export class ComplianceRequirementDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'comp-req-123456',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the compliance requirement',
    example: 'GDPR Article 32 - Security of processing',
  })
  name: string;

  @ApiProperty({
    description: 'Detailed description of the requirement',
    example: 'Implementation of appropriate technical and organizational measures to ensure security',
  })
  description: string;

  @ApiProperty({
    description: 'Compliance category',
    example: 'data-privacy',
  })
  category: string;

  @ApiProperty({
    description: 'Severity level',
    enum: Object.values(ComplianceSeverity),
    example: ComplianceSeverity.CRITICAL,
  })
  severity: ComplianceSeverity;

  @ApiProperty({
    description: 'Industry this requirement applies to',
    example: 'healthcare',
  })
  industry: string;

  @ApiProperty({
    description: 'Region where this requirement applies',
    example: 'EU',
  })
  region: string;

  @ApiProperty({
    description: 'Source of the compliance requirement',
    enum: Object.values(ComplianceSource),
    example: ComplianceSource.REGULATORY,
  })
  source: ComplianceSource;

  @ApiPropertyOptional({
    description: 'Regulatory body that issued this requirement',
    example: 'European Commission',
  })
  regulatoryBody?: string;

  @ApiPropertyOptional({
    description: 'Date when the requirement becomes effective',
    example: '2018-05-25T00:00:00Z',
  })
  effectiveDate?: Date;

  @ApiPropertyOptional({
    description: 'Deadline for compliance',
    example: '2024-12-31T23:59:59Z',
  })
  complianceDeadline?: Date;

  @ApiProperty({
    description: 'List of required actions to achieve compliance',
    example: [
      'Implement encryption for data at rest',
      'Establish incident response procedures',
      'Conduct regular security audits',
    ],
    type: [String],
  })
  requiredActions: string[];

  @ApiPropertyOptional({
    description: 'Penalties for non-compliance',
    example: 'Up to 4% of annual global turnover or €20 million',
  })
  penalties?: string;

  @ApiProperty({
    description: 'Reference URLs for more information',
    example: [
      'https://gdpr.eu/article-32-security-of-processing/',
      'https://ico.org.uk/for-organisations/guide-to-data-protection/',
    ],
    type: [String],
  })
  references: string[];

  @ApiProperty({
    description: 'Relevance score (0-1)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  relevance: number;
}

/**
 * Search Compliance Requirements Response DTO
 */
export class SearchComplianceRequirementsResponseDto {
  @ApiProperty({
    description: 'Original search query',
    example: 'data protection regulations',
  })
  query: string;

  @ApiProperty({
    description: 'List of compliance requirement results',
    type: [ComplianceRequirementDto],
  })
  results: ComplianceRequirementDto[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 42,
  })
  totalResults: number;

  @ApiProperty({
    description: 'Search timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  searchedAt: Date;

  @ApiProperty({
    description: 'Applied filters',
    type: ComplianceFilterDto,
  })
  filters: ComplianceFilterDto;
}