import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import {
  WebResearchCacheRepository,
  ResearchResult,
  ResearchQueryOptions,
} from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';

@Injectable()
export class PrismaWebResearchCacheRepository implements WebResearchCacheRepository {
  private readonly logger = new Logger(PrismaWebResearchCacheRepository.name);
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly prisma: PrismaService) {}

  private createQueryHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Find cached research results by query
   * This is one of only 2 methods actually used in the codebase
   */
  async findByQuery(
    query: string,
    options?: ResearchQueryOptions,
  ): Promise<ResearchResult[]> {
    try {
      // Search for caches containing the query text
      const caches = await this.prisma.aIWebResearchCache.findMany({
        where: {
          queryText: { contains: query },
          expiresAt: { gt: new Date() }, // Only valid caches
        },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { lastAccessedAt: 'desc' },
      });

      // Convert cached data to ResearchResult array
      const results: ResearchResult[] = [];
      for (const cache of caches) {
        const cacheResults = cache.results as any[];
        if (Array.isArray(cacheResults)) {
          results.push(...cacheResults.map(r => this.toResearchResult(r, cache)));
        }
      }

      // Update hit count for accessed caches
      if (caches.length > 0) {
        await this.prisma.aIWebResearchCache.updateMany({
          where: { id: { in: caches.map(c => c.id) } },
          data: {
            hitCount: { increment: 1 },
            lastAccessedAt: new Date(),
          },
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to find cache by query: ${query}`, error);
      return []; // Return empty array on error for safety
    }
  }

  /**
   * Store multiple research results in cache
   * This is one of only 2 methods actually used in the codebase
   */
  async storeBatch(
    results: Array<Omit<ResearchResult, 'id' | 'createdAt'>>,
  ): Promise<ResearchResult[]> {
    try {
      const stored: ResearchResult[] = [];
      
      // Group results by query
      const groupedByQuery = new Map<string, typeof results>();
      for (const result of results) {
        const key = result.query;
        if (!groupedByQuery.has(key)) {
          groupedByQuery.set(key, []);
        }
        groupedByQuery.get(key)!.push(result);
      }
      
      // Store each query group in cache
      for (const [query, queryResults] of groupedByQuery) {
        const queryHash = this.createQueryHash(query);
        
        const cache = await this.prisma.aIWebResearchCache.upsert({
          where: { queryHash },
          update: {
            results: queryResults as Prisma.JsonArray,
            lastAccessedAt: new Date(),
            hitCount: { increment: 1 },
            expiresAt: queryResults[0].expiresAt,
          },
          create: {
            queryHash,
            queryText: query,
            searchParameters: {} as Prisma.JsonValue,
            results: queryResults as Prisma.JsonArray,
            expiresAt: queryResults[0].expiresAt,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            hitCount: 1,
          },
        });
        
        // Convert stored results back to ResearchResult format
        const cacheResults = cache.results as any[];
        stored.push(...cacheResults.map(r => this.toResearchResult(r, cache)));
      }
      
      return stored;
    } catch (error) {
      this.logger.error('Failed to store batch results', error);
      throw error; // Let the use case handle the error
    }
  }

  /**
   * Convert database cache item to ResearchResult format
   */
  private toResearchResult(item: any, cache: any): ResearchResult {
    return {
      id: item.id || `${cache.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query: cache.queryText,
      url: item.url || '',
      title: item.title || '',
      content: item.content || item.description || '',
      summary: item.summary,
      relevanceScore: item.relevance || item.relevanceScore || 0.5,
      source: item.source || 'web',
      metadata: {
        author: item.author,
        publishedDate: item.publishedAt ? new Date(item.publishedAt) : undefined,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
        tags: item.tags || [],
        language: item.language,
      },
      createdAt: cache.createdAt,
      expiresAt: cache.expiresAt,
    };
  }

  // ============================================================================
  // UNUSED METHODS - Not implemented as they are not used in the codebase
  // ============================================================================

  async store(result: Omit<ResearchResult, 'id' | 'createdAt'>): Promise<ResearchResult> {
    throw new Error('Method not implemented: store() is not required for current use cases. Use storeBatch() instead.');
  }

  async findById(id: string): Promise<ResearchResult | null> {
    throw new Error('Method not implemented: findById() is not required for current use cases');
  }

  async findSimilarQueries(query: string, threshold?: number): Promise<string[]> {
    throw new Error('Method not implemented: findSimilarQueries() is not required for current use cases');
  }

  async findByUrl(url: string): Promise<ResearchResult[]> {
    throw new Error('Method not implemented: findByUrl() is not required for current use cases');
  }

  async findBySource(
    source: ResearchResult['source'],
    options?: { limit?: number; offset?: number; minRelevance?: number },
  ): Promise<ResearchResult[]> {
    throw new Error('Method not implemented: findBySource() is not required for current use cases');
  }

  async isCached(query: string): Promise<boolean> {
    throw new Error('Method not implemented: isCached() is not required for current use cases');
  }

  async getCacheStatistics(): Promise<{
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    hitRate: number;
    averageRelevance: number;
    topQueries: Array<{ query: string; count: number }>;
    topSources: Array<{ source: string; count: number }>;
  }> {
    throw new Error('Method not implemented: getCacheStatistics() is not required for current use cases');
  }

  async updateRelevance(id: string, relevanceScore: number): Promise<boolean> {
    throw new Error('Method not implemented: updateRelevance() is not required for current use cases');
  }

  async extendExpiration(id: string, days: number): Promise<boolean> {
    throw new Error('Method not implemented: extendExpiration() is not required for current use cases');
  }

  async deleteExpired(): Promise<number> {
    throw new Error('Method not implemented: deleteExpired() is not required for current use cases');
  }

  async delete(id: string): Promise<boolean> {
    throw new Error('Method not implemented: delete() is not required for current use cases');
  }

  async deleteByQuery(query: string): Promise<number> {
    throw new Error('Method not implemented: deleteByQuery() is not required for current use cases');
  }

  async clear(): Promise<void> {
    throw new Error('Method not implemented: clear() is not required for current use cases');
  }

  async getTopResults(limit?: number): Promise<ResearchResult[]> {
    throw new Error('Method not implemented: getTopResults() is not required for current use cases');
  }

  async getRecentQueries(limit?: number): Promise<Array<{
    query: string;
    count: number;
    lastAccessed: Date;
  }>> {
    throw new Error('Method not implemented: getRecentQueries() is not required for current use cases');
  }

  async markAsUsed(id: string): Promise<void> {
    throw new Error('Method not implemented: markAsUsed() is not required for current use cases');
  }

  async getUsageStats(id: string): Promise<{
    accessCount: number;
    lastAccessed: Date;
    firstAccessed: Date;
  }> {
    throw new Error('Method not implemented: getUsageStats() is not required for current use cases');
  }
}