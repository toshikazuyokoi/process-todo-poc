import { Injectable, Logger, Inject } from '@nestjs/common';
import { ProcessKnowledgeRepository } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { WebResearchCacheRepository } from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
import { KnowledgeBaseService } from '../../../domain/ai-agent/services/knowledge-base.service';
import { WebResearchService } from '../../../domain/ai-agent/services/web-research.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { ComplexityLevel } from '../../../domain/ai-agent/entities/process-analysis.entity';

// Input/Output types as per design
export interface SearchBestPracticesInput {
  userId: number;
  query: string;
  filters?: {
    industry?: string;
    processType?: string;
    complexity?: ComplexityLevel;
    tags?: string[];
  };
  limit?: number;
}

export interface BestPracticeResult {
  id: string;
  title: string;
  description: string;
  source: 'knowledge_base' | 'web_research' | 'community';
  relevance: number;
  industry?: string;
  processType?: string;
  complexity?: ComplexityLevel;
  tags?: string[];
  url?: string;
  publishedAt?: Date;
  author?: string;
  citations?: number;
}

export interface SearchBestPracticesOutput {
  query: string;
  results: BestPracticeResult[];
  totalResults: number;
  searchedAt: Date;
  filters: any;
}

/**
 * Search Best Practices Use Case
 * As per ai_agent_class_diagram.md specification
 */
@Injectable()
export class SearchBestPracticesUseCase {
  private readonly logger = new Logger(SearchBestPracticesUseCase.name);

  constructor(
    @Inject('ProcessKnowledgeRepository')
    private readonly knowledgeRepository: ProcessKnowledgeRepository,
    @Inject('WebResearchCacheRepository')
    private readonly cacheRepository: WebResearchCacheRepository,
    private readonly knowledgeService: KnowledgeBaseService,
    private readonly researchService: WebResearchService,
  ) {}

  /**
   * Execute best practices search
   * Design: SearchBestPracticesUseCase.execute()
   */
  async execute(input: SearchBestPracticesInput): Promise<SearchBestPracticesOutput> {
    this.logger.log(`Searching best practices for query: ${input.query}`);

    try {
      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Search knowledge base
      const knowledgeResults = await this.searchKnowledgeBase(input);

      // Step 3: Search cached web research
      const cachedResults = await this.searchCachedResearch(input);

      // Step 4: Optionally trigger new web research (async)
      if (knowledgeResults.length + cachedResults.length < 5) {
        this.triggerWebResearch(input); // Fire and forget
      }

      // Step 5: Combine and rank results
      const combinedResults = await this.combineAndRankResults(
        knowledgeResults,
        cachedResults,
        input,
      );

      // Step 6: Apply limit
      const limitedResults = input.limit 
        ? combinedResults.slice(0, input.limit)
        : combinedResults.slice(0, 20); // Default limit

      // Return output
      return {
        query: input.query,
        results: limitedResults,
        totalResults: combinedResults.length,
        searchedAt: new Date(),
        filters: input.filters || {},
      };

    } catch (error) {
      this.logger.error(
        `Failed to search best practices for query: ${input.query}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate input
   * Design: SearchBestPracticesUseCase.validateInput()
   */
  private validateInput(input: SearchBestPracticesInput): void {
    if (!input.query || input.query.trim().length === 0) {
      throw new DomainException('Query is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
    if (input.limit !== undefined && input.limit < 1) {
      throw new DomainException('Limit must be greater than 0');
    }
  }

  /**
   * Search knowledge base
   * Design: SearchBestPracticesUseCase.searchKnowledgeBase()
   */
  private async searchKnowledgeBase(
    input: SearchBestPracticesInput,
  ): Promise<BestPracticeResult[]> {
    this.logger.log('Searching knowledge base');

    try {
      // Use KnowledgeBaseService to search
      const searchParams = {
        query: input.query,
        industry: input.filters?.industry,
        processType: input.filters?.processType,
        category: input.filters?.processType, // Map to category
        complexity: input.filters?.complexity,
      };

      // Get related templates from knowledge base
      const templates = await this.knowledgeService.getRelatedTemplates(searchParams);

      // Convert to BestPracticeResult format
      return templates.map(template => ({
        id: template.id,
        title: template.name,
        description: template.description,
        source: 'knowledge_base' as const,
        relevance: this.calculateRelevance(template.name + ' ' + template.description, input.query),
        industry: template.industry,
        processType: template.processType,
        complexity: template.complexity as ComplexityLevel | undefined,
        tags: template.tags || [],
        publishedAt: template.createdAt,
      }));
    } catch (error) {
      this.logger.warn('Knowledge base search failed', error);
      return [];
    }
  }

  /**
   * Search cached web research
   * Design: SearchBestPracticesUseCase.searchCachedResearch()
   */
  private async searchCachedResearch(
    input: SearchBestPracticesInput,
  ): Promise<BestPracticeResult[]> {
    this.logger.log('Searching cached web research');

    try {
      // Search in web research cache
      const cached = await this.cacheRepository.findByQuery(input.query, {
        limit: 20,
      });

      if (cached && cached.length > 0) {
        // Convert cached results - handle both relevance and relevanceScore
        return cached.map((item: any) => ({
          id: item.id || `cache-${Date.now()}`,
          title: item.title,
          description: item.description || item.content,
          source: 'web_research' as const,
          relevance: item.relevance || item.relevanceScore || 0.5,
          url: item.url,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
          author: item.author,
          citations: item.citations,
          tags: item.tags || [],
        }));
      }

      return [];
    } catch (error) {
      this.logger.warn('Cached research search failed', error);
      return [];
    }
  }

  /**
   * Trigger web research (async)
   * Design: SearchBestPracticesUseCase.triggerWebResearch()
   */
  private async triggerWebResearch(input: SearchBestPracticesInput): Promise<void> {
    this.logger.log('Triggering new web research');

    try {
      // Prepare search queries
      const queries = this.buildSearchQueries(input);

      // Use WebResearchService to perform research
      for (const query of queries) {
        // Fire and forget - don't await
        this.researchService.performResearch({
          query,
          sources: ['industry_blogs', 'academic_papers', 'best_practices'],
          maxResults: 10,
        }).then((results: any) => {
          // Cache results for future use
          if (results && results.length > 0) {
            this.cacheRepository.storeBatch(
              results.map((r: any) => ({
                query: query,
                url: r.url || '',
                title: r.title || '',
                content: r.content || r.description || '',
                relevanceScore: r.relevance || 0.5,
                source: 'web' as const,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              }))
            ).catch((err: any) => {
            this.logger.warn('Failed to cache research results', err);
            });
          }
        }).catch((err: any) => {
          this.logger.warn('Web research failed', err);
        });
      }
    } catch (error) {
      this.logger.warn('Failed to trigger web research', error);
    }
  }

  /**
   * Combine and rank results
   * Design: SearchBestPracticesUseCase.combineAndRankResults()
   */
  private async combineAndRankResults(
    knowledgeResults: BestPracticeResult[],
    cachedResults: BestPracticeResult[],
    input: SearchBestPracticesInput,
  ): Promise<BestPracticeResult[]> {
    this.logger.log('Combining and ranking results');

    // Combine all results
    const allResults = [...knowledgeResults, ...cachedResults];

    // Remove duplicates based on title similarity
    const uniqueResults = this.removeDuplicates(allResults);

    // Apply filters
    let filteredResults = uniqueResults;
    if (input.filters) {
      filteredResults = this.applyFilters(uniqueResults, input.filters);
    }

    // Sort by relevance
    filteredResults.sort((a, b) => b.relevance - a.relevance);

    return filteredResults;
  }

  /**
   * Helper methods
   */

  private buildSearchQueries(input: SearchBestPracticesInput): string[] {
    const queries = [input.query];
    
    if (input.filters?.industry) {
      queries.push(`${input.query} ${input.filters.industry} industry`);
    }
    if (input.filters?.processType) {
      queries.push(`${input.query} ${input.filters.processType} process`);
    }
    
    return queries;
  }

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
    
    return matchCount / queryWords.length;
  }

  private removeDuplicates(results: BestPracticeResult[]): BestPracticeResult[] {
    const seen = new Set<string>();
    const unique: BestPracticeResult[] = [];
    
    for (const result of results) {
      const key = result.title.toLowerCase().replace(/\s+/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }
    
    return unique;
  }

  private applyFilters(
    results: BestPracticeResult[],
    filters: any,
  ): BestPracticeResult[] {
    return results.filter(result => {
      if (filters.industry && result.industry !== filters.industry) {
        return false;
      }
      if (filters.processType && result.processType !== filters.processType) {
        return false;
      }
      if (filters.complexity && result.complexity !== filters.complexity) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        const resultTags = result.tags || [];
        const hasMatchingTag = filters.tags.some((tag: string) => 
          resultTags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      return true;
    });
  }
}