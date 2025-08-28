import { Injectable, Logger, Inject } from '@nestjs/common';
import { ProcessKnowledgeRepository } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { WebResearchCacheRepository } from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
import { WebResearchService } from '../../../domain/ai-agent/services/web-research.service';
import { InformationValidationService } from '../../../domain/ai-agent/services/information-validation.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { ComplianceSeverity, ComplianceSource } from '../../dto/ai-agent/compliance-requirements.dto';

// Input/Output types as per design
export interface SearchComplianceRequirementsInput {
  userId: number;
  query: string;
  filters: {
    industry: string;      // Required
    region?: string;
    category?: string;
    severity?: ComplianceSeverity;
  };
  limit?: number;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: ComplianceSeverity;
  industry: string;
  region: string;
  source: ComplianceSource;
  regulatoryBody?: string;
  effectiveDate?: Date;
  complianceDeadline?: Date;
  requiredActions: string[];
  penalties?: string;
  references: string[];
  relevance: number;
}

export interface SearchComplianceRequirementsOutput {
  query: string;
  results: ComplianceRequirement[];
  totalResults: number;
  searchedAt: Date;
  filters: any;
}

/**
 * Search Compliance Requirements Use Case
 * As per ai_agent_implementation_plan.md Week 8-9 Task 2.4
 */
@Injectable()
export class SearchComplianceRequirementsUseCase {
  private readonly logger = new Logger(SearchComplianceRequirementsUseCase.name);
  private readonly CACHE_TTL_DAYS = 7; // Compliance info changes less frequently

  constructor(
    @Inject('ProcessKnowledgeRepository')
    private readonly knowledgeRepository: ProcessKnowledgeRepository,
    @Inject('WebResearchCacheRepository')
    private readonly cacheRepository: WebResearchCacheRepository,
    private readonly researchService: WebResearchService,
    private readonly validationService: InformationValidationService,
  ) {}

  /**
   * Execute compliance requirements search
   * Design: SearchComplianceRequirementsUseCase.execute()
   */
  async execute(input: SearchComplianceRequirementsInput): Promise<SearchComplianceRequirementsOutput> {
    this.logger.log(`Searching compliance requirements for query: ${input.query}`);

    try {
      // Step 1: Validate input (industry is required)
      this.validateInput(input);

      // Step 2: Search regulatory database
      const regulatoryResults = await this.searchRegulatoryDatabase(input);

      // Step 3: Search web for compliance information
      const webResults = await this.searchWebCompliance(input);

      // Step 4: Validate compliance data (prioritize official sources)
      const validatedResults = await this.validateComplianceData([
        ...regulatoryResults,
        ...webResults,
      ]);

      // Step 5: Rank by importance (severity + deadline)
      const rankedResults = this.rankByImportance(validatedResults);

      // Step 6: Apply limit
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
        `Failed to search compliance requirements for query: ${input.query}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate input - industry filter is required
   */
  private validateInput(input: SearchComplianceRequirementsInput): void {
    if (!input.query || input.query.trim().length === 0) {
      throw new DomainException('Query is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
    if (!input.filters?.industry) {
      throw new DomainException('Industry filter is required for compliance search');
    }
    if (input.filters.region && !this.isValidRegion(input.filters.region)) {
      throw new DomainException('Invalid region code. Use ISO 3166 format (e.g., US, EU, JP)');
    }
    if (input.limit !== undefined && input.limit < 1) {
      throw new DomainException('Limit must be greater than 0');
    }
  }

  /**
   * Validate region code (ISO 3166 compliance)
   */
  private isValidRegion(region: string): boolean {
    const validRegions = ['US', 'EU', 'JP', 'UK', 'CA', 'AU', 'SG', 'GLOBAL'];
    return validRegions.includes(region.toUpperCase());
  }

  /**
   * Search regulatory database for compliance requirements
   */
  private async searchRegulatoryDatabase(
    input: SearchComplianceRequirementsInput,
  ): Promise<ComplianceRequirement[]> {
    this.logger.log('Searching regulatory database');

    try {
      // Build search parameters
      const searchParams = {
        query: input.query,
        industry: input.filters.industry,
        category: input.filters.category || 'compliance',
        tags: [input.filters.industry, input.filters.region].filter(Boolean),
      };

      // Search in knowledge repository (contains regulatory requirements)
      const knowledgeItems = await this.knowledgeRepository.findByCategory(
        searchParams.category,
      );

      // Filter by industry and region
      const filtered = knowledgeItems.filter((item: any) => {
        const matchesIndustry = !input.filters.industry || 
          item.industry === input.filters.industry ||
          item.tags?.includes(input.filters.industry);
        
        const matchesRegion = !input.filters.region ||
          item.region === input.filters.region ||
          item.tags?.includes(input.filters.region);

        return matchesIndustry && matchesRegion;
      });

      // Convert to ComplianceRequirement format
      return filtered.map((item: any) => this.mapToComplianceRequirement(item, 'regulatory'));

    } catch (error) {
      this.logger.warn('Regulatory database search failed', error);
      return [];
    }
  }

  /**
   * Search web for compliance requirements
   */
  private async searchWebCompliance(
    input: SearchComplianceRequirementsInput,
  ): Promise<ComplianceRequirement[]> {
    this.logger.log('Searching web for compliance requirements');

    try {
      // Check cache first
      const cacheKey = this.buildCacheKey(input);
      const cached = await this.cacheRepository.findByQuery(cacheKey, {
        limit: 20,
      });

      if (cached && cached.length > 0) {
        this.logger.log('Using cached compliance results');
        return cached.map((item: any) => this.mapToComplianceRequirement(item, 'web_research'));
      }

      // Build compliance-specific search query
      const searchQuery = this.buildComplianceSearchQuery(input);

      // Perform web research
      const results = await this.researchService.performResearch({
        query: searchQuery,
        sources: ['regulatory_sites', 'compliance_databases', 'legal_resources'],
        maxResults: 20,
      });

      // Cache results for 7 days (compliance info is relatively stable)
      if (results && results.length > 0) {
        await this.cacheWebResults(cacheKey, results);
      }

      return results.map((item: any) => this.mapToComplianceRequirement(item, 'web_research'));

    } catch (error) {
      this.logger.warn('Web compliance search failed', error);
      return [];
    }
  }

  /**
   * Validate compliance data - prioritize official sources
   */
  private async validateComplianceData(
    requirements: ComplianceRequirement[],
  ): Promise<ComplianceRequirement[]> {
    this.logger.log('Validating compliance data');

    const validated: ComplianceRequirement[] = [];

    for (const requirement of requirements) {
      try {
        // Simple validation based on source reliability
        // Since InformationValidationService doesn't have validateInformation method,
        // we'll do basic validation based on source
        const confidence = this.calculateSourceConfidence(requirement);

        // Only include if confidence is high enough
        if (confidence > 0.6) {
          // Boost relevance for official sources
          if (requirement.source === ComplianceSource.REGULATORY) {
            requirement.relevance = Math.min(1, requirement.relevance * 1.5);
          }
          validated.push(requirement);
        } else {
          // Still include but with lower relevance
          requirement.relevance *= 0.7;
          validated.push(requirement);
        }
      } catch (error) {
        this.logger.warn(`Validation failed for requirement: ${requirement.name}`, error);
        // Still include but with lower relevance
        requirement.relevance *= 0.7;
        validated.push(requirement);
      }
    }

    return validated;
  }

  /**
   * Rank by importance (severity + deadline)
   */
  private rankByImportance(requirements: ComplianceRequirement[]): ComplianceRequirement[] {
    return requirements.sort((a, b) => {
      // First priority: severity
      const severityOrder = {
        [ComplianceSeverity.CRITICAL]: 4,
        [ComplianceSeverity.HIGH]: 3,
        [ComplianceSeverity.MEDIUM]: 2,
        [ComplianceSeverity.LOW]: 1,
      };

      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // Second priority: compliance deadline (sooner = higher priority)
      if (a.complianceDeadline && b.complianceDeadline) {
        return a.complianceDeadline.getTime() - b.complianceDeadline.getTime();
      }

      // Third priority: relevance score
      return b.relevance - a.relevance;
    });
  }

  /**
   * Helper: Map to ComplianceRequirement format
   */
  private mapToComplianceRequirement(
    item: any,
    source: 'regulatory' | 'web_research',
  ): ComplianceRequirement {
    return {
      id: item.id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || item.title || 'Unnamed Requirement',
      description: item.description || item.content || '',
      category: item.category || 'general',
      severity: this.extractSeverity(item),
      industry: item.industry || 'general',
      region: item.region || 'GLOBAL',
      source: source === 'regulatory' ? ComplianceSource.REGULATORY : ComplianceSource.WEB_RESEARCH,
      regulatoryBody: item.regulatoryBody || item.author,
      effectiveDate: item.effectiveDate ? new Date(item.effectiveDate) : undefined,
      complianceDeadline: item.deadline ? new Date(item.deadline) : undefined,
      requiredActions: this.extractRequiredActions(item),
      penalties: item.penalties || item.consequences,
      references: item.references || item.urls || [],
      relevance: item.relevance || this.calculateRelevance(item.name + ' ' + item.description, this.lastQuery),
    };
  }

  private lastQuery: string = '';

  /**
   * Helper: Extract severity from item
   */
  private extractSeverity(item: any): ComplianceSeverity {
    if (item.severity) return item.severity;
    
    const text = (item.name + ' ' + item.description).toLowerCase();
    if (text.includes('critical') || text.includes('mandatory') || text.includes('must')) {
      return ComplianceSeverity.CRITICAL;
    }
    if (text.includes('high') || text.includes('important') || text.includes('required')) {
      return ComplianceSeverity.HIGH;
    }
    if (text.includes('medium') || text.includes('should')) {
      return ComplianceSeverity.MEDIUM;
    }
    return ComplianceSeverity.LOW;
  }

  /**
   * Helper: Extract required actions
   */
  private extractRequiredActions(item: any): string[] {
    if (item.requiredActions) return item.requiredActions;
    if (item.actions) return item.actions;
    
    // Try to extract from description
    const actions: string[] = [];
    const text = item.description || item.content || '';
    const sentences = text.split('.');
    
    for (const sentence of sentences) {
      if (sentence.match(/must|shall|require|need to|should/i)) {
        actions.push(sentence.trim());
      }
    }
    
    return actions.slice(0, 5); // Limit to 5 actions
  }

  /**
   * Helper: Build cache key
   */
  private buildCacheKey(input: SearchComplianceRequirementsInput): string {
    const filters = input.filters;
    return `compliance:${filters.industry}:${filters.region || 'all'}:${filters.category || 'all'}:${input.query}`;
  }

  /**
   * Helper: Build compliance search query
   */
  private buildComplianceSearchQuery(input: SearchComplianceRequirementsInput): string {
    const parts = [input.query];
    const filters = input.filters;
    
    if (filters.industry) {
      parts.push(`${filters.industry} compliance requirements`);
    }
    if (filters.region) {
      parts.push(`${filters.region} regulations`);
    }
    if (filters.category === 'data-privacy') {
      parts.push('data protection privacy GDPR');
    }
    if (filters.category === 'security') {
      parts.push('security standards ISO27001 SOC2');
    }
    
    parts.push('2024'); // Focus on current requirements
    
    this.lastQuery = parts.join(' ');
    return this.lastQuery;
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
      this.logger.warn('Failed to cache compliance results', error);
    }
  }

  /**
   * Helper: Calculate relevance
   */
  private calculateRelevance(text: string, query: string): number {
    if (!query) return 0.5;
    
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

  /**
   * Helper: Calculate source confidence
   */
  private calculateSourceConfidence(requirement: ComplianceRequirement): number {
    let confidence = 0.5; // Base confidence

    // Source type
    if (requirement.source === ComplianceSource.REGULATORY) {
      confidence += 0.3;
    } else if (requirement.source === ComplianceSource.INDUSTRY_STANDARD) {
      confidence += 0.2;
    }

    // Has regulatory body
    if (requirement.regulatoryBody) {
      confidence += 0.1;
    }

    // Has references
    if (requirement.references && requirement.references.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }
}