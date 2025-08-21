import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface SearchParameters {
  maxResults?: number;
  language?: string;
  region?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  domain?: string;
  excludeDomains?: string[];
}

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  source: string;
  publishedDate?: Date;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface SourceReliability {
  score: number;
  factors: {
    domainAuthority?: number;
    contentQuality?: number;
    recency?: number;
    citations?: number;
  };
  warnings?: string[];
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly apiKey: string;
  private readonly searchEngineId: string;
  private readonly baseUrl: string;
  private rateLimitCounter = 0;
  private rateLimitResetTime = new Date();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_SEARCH_API_KEY', '');
    this.searchEngineId = this.configService.get<string>('GOOGLE_SEARCH_ENGINE_ID', '');
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1';

    if (!this.apiKey || !this.searchEngineId) {
      this.logger.warn('Google Search API credentials not configured. Web search will be limited.');
    }
  }

  async search(query: string, parameters: SearchParameters = {}): Promise<RawSearchResult[]> {
    try {
      if (!this.apiKey || !this.searchEngineId) {
        return this.mockSearch(query, parameters);
      }

      const params = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: parameters.maxResults || 10,
        ...(parameters.language && { lr: `lang_${parameters.language}` }),
        ...(parameters.region && { gl: parameters.region }),
        ...(parameters.dateRange && { 
          dateRestrict: this.formatDateRange(parameters.dateRange) 
        }),
        ...(parameters.domain && { siteSearch: parameters.domain }),
      };

      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, { params }),
      );

      return this.parseSearchResults(response.data);
    } catch (error) {
      this.logger.error('Search failed', error);
      return this.mockSearch(query, parameters);
    }
  }

  async searchBestPractices(
    industry: string,
    processType: string,
  ): Promise<RawSearchResult[]> {
    const query = `${industry} ${processType} best practices industry standards`;
    const parameters: SearchParameters = {
      maxResults: 20,
      excludeDomains: ['wikipedia.org', 'reddit.com'],
    };

    const results = await this.search(query, parameters);
    
    // Filter for high-quality sources
    return results.filter(result => {
      const reliability = this.assessSourceReliability(result.url);
      return reliability.score >= 0.6;
    });
  }

  async searchCompliance(
    industry: string,
    region: string,
  ): Promise<RawSearchResult[]> {
    const query = `${industry} compliance requirements regulations ${region}`;
    const parameters: SearchParameters = {
      maxResults: 15,
      domain: '.gov',
    };

    const governmentResults = await this.search(query, parameters);
    
    // Also search for industry-specific compliance
    const industryQuery = `${industry} regulatory compliance standards ${region}`;
    const industryResults = await this.search(industryQuery, {
      maxResults: 10,
    });

    return [...governmentResults, ...industryResults];
  }

  async searchBenchmarks(processType: string): Promise<RawSearchResult[]> {
    const query = `${processType} industry benchmarks KPIs metrics performance standards`;
    const parameters: SearchParameters = {
      maxResults: 15,
      dateRange: {
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
      },
    };

    return this.search(query, parameters);
  }

  async validateSource(url: string): Promise<SourceReliability> {
    try {
      const domain = new URL(url).hostname;
      
      // Check domain reputation (simplified implementation)
      const trustedDomains = [
        '.gov', '.edu', '.org',
        'harvard.edu', 'mit.edu', 'stanford.edu',
        'ieee.org', 'acm.org', 'iso.org',
      ];

      const domainAuthority = trustedDomains.some(td => domain.includes(td)) ? 0.9 : 0.5;
      
      // Check content recency (mock implementation)
      const recency = 0.7; // Would normally parse page for publication date
      
      const score = (domainAuthority + recency) / 2;
      
      return {
        score,
        factors: {
          domainAuthority,
          contentQuality: 0.7,
          recency,
          citations: 5,
        },
        warnings: score < 0.5 ? ['Low reliability source'] : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to validate source', error);
      return {
        score: 0,
        factors: {},
        warnings: ['Could not validate source'],
      };
    }
  }

  async extractContent(url: string): Promise<string> {
    try {
      // In production, this would use a web scraping service or library
      // For now, return a mock response
      this.logger.warn('Content extraction not fully implemented. Using mock data.');
      return `Content from ${url}`;
    } catch (error) {
      this.logger.error('Failed to extract content', error);
      throw new Error('Failed to extract content from URL');
    }
  }

  async checkRateLimit(): Promise<boolean> {
    const now = new Date();
    
    // Reset counter if hour has passed
    if (now.getTime() - this.rateLimitResetTime.getTime() > 3600000) {
      this.rateLimitCounter = 0;
      this.rateLimitResetTime = now;
    }

    const maxRequests = this.configService.get<number>('SEARCH_API_RATE_LIMIT', 100);
    
    if (this.rateLimitCounter >= maxRequests) {
      return false;
    }

    this.rateLimitCounter++;
    return true;
  }

  private parseSearchResults(data: any): RawSearchResult[] {
    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: new URL(item.link).hostname,
      relevanceScore: this.calculateRelevance(item),
      metadata: {
        displayLink: item.displayLink,
        formattedUrl: item.formattedUrl,
      },
    }));
  }

  private calculateRelevance(item: any): number {
    // Simple relevance calculation
    // In production, this would be more sophisticated
    return 0.7;
  }

  private formatDateRange(dateRange: { from?: Date; to?: Date }): string {
    if (dateRange.from && !dateRange.to) {
      const days = Math.floor(
        (Date.now() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24),
      );
      return `d${days}`;
    }
    return 'd365'; // Default to last year
  }

  private assessSourceReliability(url: string): SourceReliability {
    // Simplified reliability assessment
    const domain = new URL(url).hostname;
    
    const scores: Record<string, number> = {
      '.gov': 0.95,
      '.edu': 0.9,
      '.org': 0.8,
      'wikipedia.org': 0.7,
      'medium.com': 0.6,
      'blogspot.com': 0.5,
    };

    for (const [key, score] of Object.entries(scores)) {
      if (domain.includes(key)) {
        return {
          score,
          factors: { domainAuthority: score },
        };
      }
    }

    return {
      score: 0.5,
      factors: { domainAuthority: 0.5 },
    };
  }

  private async mockSearch(
    query: string,
    parameters: SearchParameters,
  ): Promise<RawSearchResult[]> {
    // Mock implementation for development/testing
    this.logger.debug(`Mock search for: ${query}`);
    
    return [
      {
        title: `Best Practices for ${query}`,
        url: 'https://example.com/best-practices',
        snippet: `Industry-leading practices for ${query}...`,
        source: 'example.com',
        relevanceScore: 0.8,
      },
      {
        title: `${query} - Complete Guide`,
        url: 'https://guide.example.com/complete',
        snippet: `A comprehensive guide to ${query}...`,
        source: 'guide.example.com',
        relevanceScore: 0.75,
      },
    ];
  }
}