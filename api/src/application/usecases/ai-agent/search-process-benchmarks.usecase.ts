import { Injectable, Logger, Inject } from '@nestjs/common';
import { ProcessKnowledgeRepository } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { WebResearchCacheRepository } from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
import { WebResearchService } from '../../../domain/ai-agent/services/web-research.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { CompanySize, MetricType, BenchmarkSource, BenchmarkValuesDto } from '../../dto/ai-agent/process-benchmarks.dto';

// Input/Output types as per design
export interface SearchProcessBenchmarksInput {
  userId: number;
  query: string;
  filters: {
    industry: string;      // Required
    processType: string;   // Required
    metricType?: MetricType;
    companySize?: CompanySize;
    region?: string;
  };
  limit?: number;
}

export interface ProcessBenchmark {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  processType: string;
  metricUnit: string;
  benchmarkValues: BenchmarkValuesDto;
  source: BenchmarkSource;
  methodology?: string;
  sampleSize?: number;
  year: number;
  companySize?: CompanySize;
  region?: string;
  tags: string[];
  references: string[];
  confidence: number;
  relevance: number;
}

export interface SearchProcessBenchmarksOutput {
  query: string;
  results: ProcessBenchmark[];
  totalResults: number;
  searchedAt: Date;
  filters: any;
}

/**
 * Search Process Benchmarks Use Case
 * As per ai_agent_implementation_plan.md Week 8-9 Task 2.4
 */
@Injectable()
export class SearchProcessBenchmarksUseCase {
  private readonly logger = new Logger(SearchProcessBenchmarksUseCase.name);
  private readonly CACHE_TTL_DAYS = 30; // Benchmarks are relatively stable

  constructor(
    @Inject('ProcessKnowledgeRepository')
    private readonly knowledgeRepository: ProcessKnowledgeRepository,
    @Inject('WebResearchCacheRepository')
    private readonly cacheRepository: WebResearchCacheRepository,
    private readonly researchService: WebResearchService,
  ) {}

  /**
   * Execute process benchmarks search
   * Design: SearchProcessBenchmarksUseCase.execute()
   */
  async execute(input: SearchProcessBenchmarksInput): Promise<SearchProcessBenchmarksOutput> {
    this.logger.log(`Searching process benchmarks for query: ${input.query}`);

    try {
      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Search benchmark database
      const databaseResults = await this.searchBenchmarkDatabase(input);

      // Step 3: Search industry reports
      const industryResults = await this.searchIndustryReports(input);

      // Step 4: Extract metric values from text
      const processedResults = this.extractMetricValues([
        ...databaseResults,
        ...industryResults,
      ]);

      // Step 5: Normalize metrics for consistency
      const normalizedResults = this.normalizeMetrics(processedResults);

      // Step 6: Calculate confidence scores
      const scoredResults = this.calculateConfidence(normalizedResults);

      // Step 7: Rank results by relevance × confidence
      const rankedResults = this.rankResults(scoredResults, input);

      // Step 8: Apply limit
      const limitedResults = input.limit 
        ? rankedResults.slice(0, input.limit)
        : rankedResults.slice(0, 20); // Default limit

      // Return output
      return {
        query: input.query,
        results: limitedResults,
        totalResults: rankedResults.length,
        searchedAt: new Date(),
        filters: input.filters,
      };

    } catch (error) {
      this.logger.error(
        `Failed to search process benchmarks for query: ${input.query}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate input - industry and processType are required
   */
  private validateInput(input: SearchProcessBenchmarksInput): void {
    if (!input.query || input.query.trim().length === 0) {
      throw new DomainException('Query is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
    if (!input.filters?.industry) {
      throw new DomainException('Industry filter is required for benchmark search');
    }
    if (!input.filters?.processType) {
      throw new DomainException('Process type filter is required for benchmark search');
    }
    if (input.limit !== undefined && input.limit < 1) {
      throw new DomainException('Limit must be greater than 0');
    }
  }

  /**
   * Search benchmark database
   */
  private async searchBenchmarkDatabase(
    input: SearchProcessBenchmarksInput,
  ): Promise<ProcessBenchmark[]> {
    this.logger.log('Searching benchmark database');

    try {
      // Build search parameters
      const searchParams = {
        query: input.query,
        industry: input.filters.industry,
        category: 'benchmark',
        tags: [
          input.filters.industry,
          input.filters.processType,
          input.filters.metricType,
        ].filter(Boolean),
      };

      // Search in knowledge repository
      const knowledgeItems = await this.knowledgeRepository.findByIndustry(
        searchParams.industry,
      );

      // Filter by process type
      const filtered = knowledgeItems.filter((item: any) => {
        const matchesProcess = item.processType === input.filters.processType ||
          item.tags?.includes(input.filters.processType);
        
        const matchesMetric = !input.filters.metricType ||
          item.metricType === input.filters.metricType ||
          item.category === input.filters.metricType;

        return matchesProcess && matchesMetric;
      });

      // Convert to ProcessBenchmark format
      return filtered.map((item: any) => this.mapToBenchmark(item, BenchmarkSource.INDUSTRY_REPORT));

    } catch (error) {
      this.logger.warn('Benchmark database search failed', error);
      return [];
    }
  }

  /**
   * Search industry reports for benchmarks
   */
  private async searchIndustryReports(
    input: SearchProcessBenchmarksInput,
  ): Promise<ProcessBenchmark[]> {
    this.logger.log('Searching industry reports');

    try {
      // Check cache first
      const cacheKey = this.buildCacheKey(input);
      const cached = await this.cacheRepository.findByQuery(cacheKey, {
        limit: 20,
      });

      if (cached && cached.length > 0) {
        this.logger.log('Using cached benchmark results');
        return cached.map((item: any) => this.mapToBenchmark(item, BenchmarkSource.WEB_RESEARCH));
      }

      // Build benchmark-specific search query
      const searchQuery = this.buildBenchmarkSearchQuery(input);

      // Perform web research
      const results = await this.researchService.performResearch({
        query: searchQuery,
        sources: ['industry_reports', 'research_papers', 'benchmarking_sites'],
        maxResults: 20,
      });

      // Cache results for 30 days (benchmarks are stable)
      if (results && results.length > 0) {
        await this.cacheWebResults(cacheKey, results);
      }

      return results.map((item: any) => this.mapToBenchmark(item, BenchmarkSource.WEB_RESEARCH));

    } catch (error) {
      this.logger.warn('Industry reports search failed', error);
      return [];
    }
  }

  /**
   * Extract metric values from text content
   */
  private extractMetricValues(benchmarks: ProcessBenchmark[]): ProcessBenchmark[] {
    return benchmarks.map(benchmark => {
      // If benchmark values already exist, validate them
      if (benchmark.benchmarkValues && this.hasValidBenchmarkValues(benchmark.benchmarkValues)) {
        return benchmark;
      }

      // Try to extract values from description/content
      const extractedValues = this.extractValuesFromText(
        benchmark.description,
        benchmark.metricUnit,
      );

      if (extractedValues) {
        benchmark.benchmarkValues = extractedValues;
      } else {
        // Generate placeholder values if extraction fails
        benchmark.benchmarkValues = this.generatePlaceholderValues(benchmark.category);
      }

      return benchmark;
    });
  }

  /**
   * Extract numeric values from text
   */
  private extractValuesFromText(text: string, unit: string): BenchmarkValuesDto | null {
    // Regular expressions for common patterns - fixed to handle units (days, hours, etc.)
    const patterns = {
      p25: /25(?:th)?\s*percentile[:\s]+(\d+(?:\.\d+)?)\s*(?:days?|hours?|%)?/i,
      p50: /(?:50(?:th)?\s*percentile|median)[:\s]+(\d+(?:\.\d+)?)\s*(?:days?|hours?|%)?/i,
      p75: /75(?:th)?\s*percentile[:\s]+(\d+(?:\.\d+)?)\s*(?:days?|hours?|%)?/i,
      p90: /90(?:th)?\s*percentile[:\s]+(\d+(?:\.\d+)?)\s*(?:days?|hours?|%)?/i,
      average: /average[:\s]+(\d+(?:\.\d+)?)\s*(?:days?|hours?|%)?/i,
      range: /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g,
      number: /\b(\d+(?:\.\d+)?)\b/g,
    };

    const values: Partial<BenchmarkValuesDto> = {};
    
    // Try to extract each percentile directly
    const p25Match = text.match(patterns.p25);
    if (p25Match) values.p25 = parseFloat(p25Match[1]);
    
    const p50Match = text.match(patterns.p50);
    if (p50Match) values.p50 = parseFloat(p50Match[1]);
    
    const p75Match = text.match(patterns.p75);
    if (p75Match) values.p75 = parseFloat(p75Match[1]);
    
    const p90Match = text.match(patterns.p90);
    if (p90Match) values.p90 = parseFloat(p90Match[1]);

    // Try to extract average
    const avgMatch = text.match(patterns.average);
    if (avgMatch) {
      values.average = parseFloat(avgMatch[1]);
    }

    // If we have at least median, calculate other percentiles
    if (values.p50) {
      values.p25 = values.p25 || values.p50 * 0.75;
      values.p75 = values.p75 || values.p50 * 1.25;
      values.p90 = values.p90 || values.p50 * 1.5;
      
      return values as BenchmarkValuesDto;
    }

    // Try to extract from ranges
    const rangeMatch = text.match(patterns.range);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      
      return {
        p25: min + (max - min) * 0.25,
        p50: min + (max - min) * 0.5,
        p75: min + (max - min) * 0.75,
        p90: min + (max - min) * 0.9,
        average: (min + max) / 2,
      };
    }

    return null;
  }

  /**
   * Normalize metrics to standard units
   */
  private normalizeMetrics(benchmarks: ProcessBenchmark[]): ProcessBenchmark[] {
    return benchmarks.map(benchmark => {
      // Convert time units to days
      if (benchmark.category === 'time' || benchmark.metricUnit.includes('hour') || benchmark.metricUnit.includes('day')) {
        benchmark = this.normalizeTimeMetric(benchmark);
      }

      // Convert percentages to 0-100 scale
      if (benchmark.metricUnit === 'percentage' || benchmark.metricUnit === '%') {
        benchmark = this.normalizePercentageMetric(benchmark);
      }

      // Remove outliers
      benchmark = this.removeOutliers(benchmark);

      return benchmark;
    });
  }

  /**
   * Normalize time metrics to days
   */
  private normalizeTimeMetric(benchmark: ProcessBenchmark): ProcessBenchmark {
    let multiplier = 1;
    
    if (benchmark.metricUnit === 'hours' || benchmark.metricUnit === 'hour') {
      multiplier = 1 / 24;
      benchmark.metricUnit = 'days';
    } else if (benchmark.metricUnit === 'minutes' || benchmark.metricUnit === 'minute') {
      multiplier = 1 / (24 * 60);
      benchmark.metricUnit = 'days';
    } else if (benchmark.metricUnit === 'weeks' || benchmark.metricUnit === 'week') {
      multiplier = 7;
      benchmark.metricUnit = 'days';
    }

    if (multiplier !== 1) {
      benchmark.benchmarkValues = {
        p25: benchmark.benchmarkValues.p25 * multiplier,
        p50: benchmark.benchmarkValues.p50 * multiplier,
        p75: benchmark.benchmarkValues.p75 * multiplier,
        p90: benchmark.benchmarkValues.p90 * multiplier,
        average: benchmark.benchmarkValues.average ? benchmark.benchmarkValues.average * multiplier : undefined,
      };
    }

    return benchmark;
  }

  /**
   * Normalize percentage metrics
   */
  private normalizePercentageMetric(benchmark: ProcessBenchmark): ProcessBenchmark {
    const values = benchmark.benchmarkValues;
    
    // Ensure all values are between 0 and 100
    benchmark.benchmarkValues = {
      p25: Math.min(100, Math.max(0, values.p25)),
      p50: Math.min(100, Math.max(0, values.p50)),
      p75: Math.min(100, Math.max(0, values.p75)),
      p90: Math.min(100, Math.max(0, values.p90)),
      average: values.average ? Math.min(100, Math.max(0, values.average)) : undefined,
    };

    benchmark.metricUnit = 'percentage';
    return benchmark;
  }

  /**
   * Remove statistical outliers
   */
  private removeOutliers(benchmark: ProcessBenchmark): ProcessBenchmark {
    const values = [
      benchmark.benchmarkValues.p25,
      benchmark.benchmarkValues.p50,
      benchmark.benchmarkValues.p75,
      benchmark.benchmarkValues.p90,
    ];

    // Calculate IQR
    const q1 = values[0];
    const q3 = values[2];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Adjust values if they're outliers
    benchmark.benchmarkValues = {
      p25: Math.max(lowerBound, benchmark.benchmarkValues.p25),
      p50: benchmark.benchmarkValues.p50,
      p75: Math.min(upperBound, benchmark.benchmarkValues.p75),
      p90: Math.min(upperBound * 1.2, benchmark.benchmarkValues.p90), // Allow p90 to be slightly higher
      average: benchmark.benchmarkValues.average,
    };

    return benchmark;
  }

  /**
   * Calculate confidence scores based on data quality
   */
  private calculateConfidence(benchmarks: ProcessBenchmark[]): ProcessBenchmark[] {
    const currentYear = new Date().getFullYear();

    return benchmarks.map(benchmark => {
      let confidence = 0.5; // Base confidence

      // Factor 1: Source reliability
      if (benchmark.source === BenchmarkSource.INDUSTRY_REPORT) {
        confidence += 0.2;
      } else if (benchmark.source === BenchmarkSource.RESEARCH_PAPER) {
        confidence += 0.15;
      }

      // Factor 2: Sample size
      if (benchmark.sampleSize) {
        if (benchmark.sampleSize >= 1000) confidence += 0.15;
        else if (benchmark.sampleSize >= 500) confidence += 0.1;
        else if (benchmark.sampleSize >= 100) confidence += 0.05;
      }

      // Factor 3: Data recency (decay over time)
      if (benchmark.year) {
        const age = currentYear - benchmark.year;
        if (age <= 1) confidence += 0.15;
        else if (age <= 2) confidence += 0.1;
        else if (age <= 3) confidence += 0.05;
        else confidence -= age * 0.02; // Decay for older data
      }

      // Factor 4: Methodology clarity
      if (benchmark.methodology && benchmark.methodology.length > 50) {
        confidence += 0.05;
      }

      // Ensure confidence is between 0 and 1
      benchmark.confidence = Math.min(1, Math.max(0, confidence));

      return benchmark;
    });
  }

  /**
   * Rank results by relevance × confidence
   */
  private rankResults(
    benchmarks: ProcessBenchmark[],
    input: SearchProcessBenchmarksInput,
  ): ProcessBenchmark[] {
    return benchmarks
      .map(benchmark => {
        // Calculate relevance if not already set
        if (!benchmark.relevance) {
          benchmark.relevance = this.calculateRelevance(
            benchmark.name + ' ' + benchmark.description,
            input.query,
          );
        }

        // Apply filter boosts
        if (input.filters.companySize && benchmark.companySize === input.filters.companySize) {
          benchmark.relevance = Math.min(1, benchmark.relevance * 1.2);
        }
        if (input.filters.region && benchmark.region === input.filters.region) {
          benchmark.relevance = Math.min(1, benchmark.relevance * 1.1);
        }

        return benchmark;
      })
      .sort((a, b) => {
        // Combined score: relevance × confidence
        const scoreA = a.relevance * a.confidence;
        const scoreB = b.relevance * b.confidence;
        return scoreB - scoreA;
      });
  }

  /**
   * Helper: Map to ProcessBenchmark format
   */
  private mapToBenchmark(item: any, source: BenchmarkSource): ProcessBenchmark {
    const currentYear = new Date().getFullYear();

    return {
      id: item.id || `bench-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || item.title || 'Unnamed Benchmark',
      description: item.description || item.content || '',
      category: item.category || item.metricType || 'general',
      industry: item.industry || 'general',
      processType: item.processType || 'general',
      metricUnit: item.metricUnit || item.unit || 'count',
      benchmarkValues: item.benchmarkValues || null,  // Don't generate placeholder values here
      source,
      methodology: item.methodology,
      sampleSize: item.sampleSize ? parseInt(item.sampleSize) : undefined,
      year: item.year || currentYear,
      companySize: item.companySize,
      region: item.region,
      tags: item.tags || [],
      references: item.references || item.urls || [],
      confidence: item.confidence || 0.5,
      relevance: item.relevance || 0.5,
    };
  }

  /**
   * Helper: Check if benchmark values are valid
   */
  private hasValidBenchmarkValues(values: BenchmarkValuesDto | null): boolean {
    if (!values) return false;
    
    return (
      typeof values.p25 === 'number' &&
      typeof values.p50 === 'number' &&
      typeof values.p75 === 'number' &&
      typeof values.p90 === 'number' &&
      values.p25 <= values.p50 &&
      values.p50 <= values.p75 &&
      values.p75 <= values.p90
    );
  }

  /**
   * Helper: Generate placeholder values
   */
  private generatePlaceholderValues(category: string): BenchmarkValuesDto {
    // Generate reasonable defaults based on category
    if (category === 'time') {
      return { p25: 5, p50: 10, p75: 15, p90: 20 };
    } else if (category === 'quality' || category === 'percentage') {
      return { p25: 70, p50: 80, p75: 90, p90: 95 };
    } else if (category === 'cost') {
      return { p25: 1000, p50: 5000, p75: 10000, p90: 20000 };
    } else {
      return { p25: 25, p50: 50, p75: 75, p90: 90 };
    }
  }

  /**
   * Helper: Build cache key
   */
  private buildCacheKey(input: SearchProcessBenchmarksInput): string {
    const filters = input.filters;
    return `benchmark:${filters.industry}:${filters.processType}:${filters.metricType || 'all'}:${input.query}`;
  }

  /**
   * Helper: Build benchmark search query
   */
  private buildBenchmarkSearchQuery(input: SearchProcessBenchmarksInput): string {
    const parts = [input.query];
    const filters = input.filters;
    
    parts.push(`${filters.industry} ${filters.processType} benchmarks KPI metrics`);
    
    if (filters.metricType) {
      parts.push(filters.metricType);
    }
    if (filters.companySize) {
      parts.push(`${filters.companySize} company`);
    }
    
    parts.push('2024 statistics percentile median');
    
    return parts.join(' ');
  }

  /**
   * Helper: Cache web results
   */
  private async cacheWebResults(key: string, results: any[]): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.cacheRepository.storeBatch(
        results.map(r => ({
          query: key,
          url: r.url || '',
          title: r.title || r.name || '',
          content: r.content || r.description || '',
          relevanceScore: r.relevance || 0.5,
          source: 'web' as const,
          expiresAt,
        }))
      );
    } catch (error) {
      this.logger.warn('Failed to cache benchmark results', error);
    }
  }

  /**
   * Helper: Calculate relevance
   */
  private calculateRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ');
    
    let matchCount = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matchCount++;
      }
    }
    
    return Math.min(1, matchCount / queryWords.length);
  }
}