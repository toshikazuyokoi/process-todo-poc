import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface WebResearchCache {
  id?: number;
  query: string;
  queryType: string;
  results: any[];
  metadata?: Record<string, any>;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebResearchCacheRepository {
  save(cache: WebResearchCache): Promise<WebResearchCache>;
  findByQuery(query: string, queryType: string): Promise<WebResearchCache | null>;
  findValid(query: string, queryType: string): Promise<WebResearchCache | null>;
  deleteExpired(): Promise<number>;
  delete(id: number): Promise<void>;
}

@Injectable()
export class PrismaWebResearchCacheRepository implements WebResearchCacheRepository {
  private readonly logger = new Logger(PrismaWebResearchCacheRepository.name);
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly prisma: PrismaService) {}

  async save(cache: WebResearchCache): Promise<WebResearchCache> {
    try {
      const data = this.toDbModel(cache);
      
      const saved = await this.prisma.aIWebResearchCache.upsert({
        where: {
          query_queryType: {
            query: cache.query,
            queryType: cache.queryType,
          },
        },
        update: data,
        create: data,
      });

      return this.fromDbModel(saved);
    } catch (error) {
      this.logger.error('Failed to save web research cache', error);
      throw new Error('Failed to save web research cache');
    }
  }

  async findByQuery(
    query: string,
    queryType: string,
  ): Promise<WebResearchCache | null> {
    try {
      const cache = await this.prisma.aIWebResearchCache.findUnique({
        where: {
          query_queryType: {
            query,
            queryType,
          },
        },
      });

      return cache ? this.fromDbModel(cache) : null;
    } catch (error) {
      this.logger.error(`Failed to find cache by query: ${query}`, error);
      return null;
    }
  }

  async findValid(
    query: string,
    queryType: string,
  ): Promise<WebResearchCache | null> {
    try {
      const cache = await this.prisma.aIWebResearchCache.findFirst({
        where: {
          query,
          queryType,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      return cache ? this.fromDbModel(cache) : null;
    } catch (error) {
      this.logger.error(`Failed to find valid cache for query: ${query}`, error);
      return null;
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.prisma.aIWebResearchCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.debug(`Deleted ${result.count} expired cache entries`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete expired cache entries', error);
      return 0;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.aIWebResearchCache.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete cache: ${id}`, error);
      throw new Error('Failed to delete cache');
    }
  }

  async findRecent(limit: number = 10): Promise<WebResearchCache[]> {
    try {
      const caches = await this.prisma.aIWebResearchCache.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return caches.map(c => this.fromDbModel(c));
    } catch (error) {
      this.logger.error('Failed to find recent cache entries', error);
      return [];
    }
  }

  async findByQueryType(queryType: string): Promise<WebResearchCache[]> {
    try {
      const caches = await this.prisma.aIWebResearchCache.findMany({
        where: { queryType },
        orderBy: { createdAt: 'desc' },
      });

      return caches.map(c => this.fromDbModel(c));
    } catch (error) {
      this.logger.error(`Failed to find cache by query type: ${queryType}`, error);
      return [];
    }
  }

  async invalidate(query: string, queryType: string): Promise<void> {
    try {
      await this.prisma.aIWebResearchCache.update({
        where: {
          query_queryType: {
            query,
            queryType,
          },
        },
        data: {
          expiresAt: new Date(), // Set to current time to invalidate
        },
      });
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for query: ${query}`, error);
      // Silently fail as cache invalidation is not critical
    }
  }

  async getStatistics(): Promise<Record<string, any>> {
    try {
      const [total, valid, expired] = await Promise.all([
        this.prisma.aIWebResearchCache.count(),
        this.prisma.aIWebResearchCache.count({
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
        }),
        this.prisma.aIWebResearchCache.count({
          where: {
            expiresAt: {
              lte: new Date(),
            },
          },
        }),
      ]);

      const hitRate = total > 0 ? (valid / total) * 100 : 0;

      return {
        total,
        valid,
        expired,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get cache statistics', error);
      return {
        total: 0,
        valid: 0,
        expired: 0,
        hitRate: 0,
      };
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.prisma.aIWebResearchCache.deleteMany({});
      this.logger.debug('Cleared all cache entries');
    } catch (error) {
      this.logger.error('Failed to clear all cache entries', error);
      throw new Error('Failed to clear cache');
    }
  }

  private toDbModel(cache: WebResearchCache): any {
    const expiresAt = cache.expiresAt || new Date(Date.now() + this.defaultTTL);

    return {
      query: cache.query,
      queryType: cache.queryType,
      results: cache.results as Prisma.JsonArray,
      metadata: (cache.metadata || {}) as Prisma.JsonValue,
      expiresAt,
      createdAt: cache.createdAt || new Date(),
      updatedAt: new Date(),
    };
  }

  private fromDbModel(data: any): WebResearchCache {
    return {
      id: data.id,
      query: data.query,
      queryType: data.queryType,
      results: data.results as any[],
      metadata: data.metadata as Record<string, any>,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}