import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Company Size Enum
 */
export enum CompanySize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

/**
 * Metric Type Enum
 */
export enum MetricType {
  TIME = 'time',
  COST = 'cost',
  QUALITY = 'quality',
  EFFICIENCY = 'efficiency',
}

/**
 * Benchmark Source Type Enum
 */
export enum BenchmarkSource {
  INDUSTRY_REPORT = 'industry_report',
  RESEARCH_PAPER = 'research_paper',
  WEB_RESEARCH = 'web_research',
}

/**
 * Benchmark Values DTO
 */
export class BenchmarkValuesDto {
  @ApiProperty({
    description: '25th percentile value',
    example: 5,
  })
  p25: number;

  @ApiProperty({
    description: '50th percentile (median) value',
    example: 10,
  })
  p50: number;

  @ApiProperty({
    description: '75th percentile value',
    example: 15,
  })
  p75: number;

  @ApiProperty({
    description: '90th percentile value',
    example: 20,
  })
  p90: number;

  @ApiPropertyOptional({
    description: 'Average value',
    example: 12.5,
  })
  average?: number;
}

/**
 * Process Benchmarks Filter DTO
 */
export class BenchmarksFilterDto {
  @ApiProperty({
    description: 'Industry filter',
    example: 'software',
    enum: ['software', 'healthcare', 'finance', 'manufacturing', 'retail', 'logistics', 'general'],
  })
  @IsNotEmpty()
  @IsString()
  industry: string;

  @ApiProperty({
    description: 'Process type filter',
    example: 'development',
    enum: ['development', 'manufacturing', 'sales', 'support', 'operations', 'general'],
  })
  @IsNotEmpty()
  @IsString()
  processType: string;

  @ApiPropertyOptional({
    description: 'Metric type filter',
    enum: Object.values(MetricType),
    example: MetricType.TIME,
  })
  @IsOptional()
  @IsEnum(MetricType)
  metricType?: MetricType;

  @ApiPropertyOptional({
    description: 'Company size filter',
    enum: Object.values(CompanySize),
    example: CompanySize.MEDIUM,
  })
  @IsOptional()
  @IsEnum(CompanySize)
  companySize?: CompanySize;

  @ApiPropertyOptional({
    description: 'Region filter',
    example: 'US',
    enum: ['US', 'EU', 'JP', 'UK', 'CA', 'AU', 'SG', 'GLOBAL'],
  })
  @IsOptional()
  @IsString()
  region?: string;
}

/**
 * Search Process Benchmarks Request DTO
 */
export class SearchProcessBenchmarksDto {
  @ApiProperty({
    description: 'Search query for process benchmarks',
    example: 'software release cycle time',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Search filters (industry and processType are required)',
    type: BenchmarksFilterDto,
  })
  @ValidateNested()
  @Type(() => BenchmarksFilterDto)
  filters: BenchmarksFilterDto;

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
 * Process Benchmark Result DTO
 */
export class ProcessBenchmarkDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'benchmark-123456',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the benchmark metric',
    example: 'Software Release Cycle Time',
  })
  name: string;

  @ApiProperty({
    description: 'Detailed description of the benchmark',
    example: 'Average time from code commit to production deployment',
  })
  description: string;

  @ApiProperty({
    description: 'Metric category',
    example: 'time',
  })
  category: string;

  @ApiProperty({
    description: 'Industry this benchmark applies to',
    example: 'software',
  })
  industry: string;

  @ApiProperty({
    description: 'Process type',
    example: 'development',
  })
  processType: string;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'days',
    enum: ['days', 'hours', 'minutes', 'percentage', 'count', 'dollars', 'score'],
  })
  metricUnit: string;

  @ApiProperty({
    description: 'Benchmark percentile values',
    type: BenchmarkValuesDto,
  })
  benchmarkValues: BenchmarkValuesDto;

  @ApiProperty({
    description: 'Source of the benchmark data',
    enum: Object.values(BenchmarkSource),
    example: BenchmarkSource.INDUSTRY_REPORT,
  })
  source: BenchmarkSource;

  @ApiPropertyOptional({
    description: 'Methodology used for data collection',
    example: 'Survey of 500 software companies worldwide',
  })
  methodology?: string;

  @ApiPropertyOptional({
    description: 'Sample size for the benchmark',
    example: 500,
  })
  sampleSize?: number;

  @ApiProperty({
    description: 'Year the benchmark data was collected',
    example: 2024,
    minimum: 2020,
    maximum: 2030,
  })
  year: number;

  @ApiPropertyOptional({
    description: 'Company size category',
    enum: Object.values(CompanySize),
    example: CompanySize.MEDIUM,
  })
  companySize?: CompanySize;

  @ApiPropertyOptional({
    description: 'Region where benchmark was collected',
    example: 'US',
  })
  region?: string;

  @ApiProperty({
    description: 'Associated tags',
    example: ['agile', 'devops', 'continuous-delivery'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Reference URLs for more information',
    example: [
      'https://example.com/industry-report-2024',
      'https://research.org/software-benchmarks',
    ],
    type: [String],
  })
  references: string[];

  @ApiProperty({
    description: 'Data confidence score (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  @ApiProperty({
    description: 'Relevance score (0-1)',
    example: 0.9,
    minimum: 0,
    maximum: 1,
  })
  relevance: number;
}

/**
 * Search Process Benchmarks Response DTO
 */
export class SearchProcessBenchmarksResponseDto {
  @ApiProperty({
    description: 'Original search query',
    example: 'software release cycle time',
  })
  query: string;

  @ApiProperty({
    description: 'List of benchmark results',
    type: [ProcessBenchmarkDto],
  })
  results: ProcessBenchmarkDto[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 15,
  })
  totalResults: number;

  @ApiProperty({
    description: 'Search timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  searchedAt: Date;

  @ApiProperty({
    description: 'Applied filters',
    type: BenchmarksFilterDto,
  })
  filters: BenchmarksFilterDto;
}