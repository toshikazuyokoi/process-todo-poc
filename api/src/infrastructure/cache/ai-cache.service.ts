import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CacheKeyGenerator } from './cache-key.generator';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for grouped invalidation
  compress?: boolean; // Whether to compress the data
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private statistics: CacheStatistics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  constructor(
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly keyGenerator: CacheKeyGenerator,
  ) {
    this.defaultTTL = this.configService.get<number>('AI_CACHE_TTL', 3600); // 1 hour
    this.maxSize = this.configService.get<number>('AI_CACHE_MAX_SIZE', 1000);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      
      if (value !== null && value !== undefined) {
        this.statistics.hits++;
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.statistics.misses++;
        this.logger.debug(`Cache miss for key: ${key}`);
      }

      this.updateHitRate();
      return value || null;
    } catch (error) {
      this.logger.error(`Failed to get cache for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || this.defaultTTL;
      
      await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds
      
      this.statistics.sets++;
      this.logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);

      // Store tags if provided
      if (options?.tags && options.tags.length > 0) {
        await this.storeTags(key, options.tags);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache for key: ${key}`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.statistics.deletes++;
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache for key: ${key}`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await (this.cacheManager.store as any)?.keys?.() || [];
      const matchingKeys = keys.filter((key: string) => 
        this.keyGenerator.matchesPattern(key, pattern)
      );

      for (const key of matchingKeys) {
        await this.delete(key);
      }

      this.logger.debug(`Deleted ${matchingKeys.length} keys matching pattern: ${pattern}`);
      return matchingKeys.length;
    } catch (error) {
      this.logger.error(`Failed to delete keys by pattern: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * Delete all keys with specific tag
   */
  async deleteByTag(tag: string): Promise<number> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.cacheManager.get<string[]>(tagKey);

      if (!keys || keys.length === 0) {
        return 0;
      }

      for (const key of keys) {
        await this.delete(key);
      }

      await this.cacheManager.del(tagKey);
      
      this.logger.debug(`Deleted ${keys.length} keys with tag: ${tag}`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Failed to delete keys by tag: ${tag}`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.resetStatistics();
      this.logger.debug('Cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
    }
  }

  /**
   * Get or set cache value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Cache AI response
   */
  async cacheAIResponse(
    prompt: string,
    context: Record<string, any>,
    response: any,
    ttl?: number,
  ): Promise<void> {
    const key = this.keyGenerator.generateResponseKey(prompt, context);
    await this.set(key, response, { ttl, tags: ['ai-response'] });
  }

  /**
   * Get cached AI response
   */
  async getCachedAIResponse(
    prompt: string,
    context: Record<string, any>,
  ): Promise<any | null> {
    const key = this.keyGenerator.generateResponseKey(prompt, context);
    return this.get(key);
  }

  /**
   * Cache template generation
   */
  async cacheTemplate(
    requirements: any[],
    context: Record<string, any>,
    template: any,
    ttl?: number,
  ): Promise<void> {
    const key = this.keyGenerator.generateTemplateKey(requirements, context);
    await this.set(key, template, { ttl, tags: ['template'] });
  }

  /**
   * Get cached template
   */
  async getCachedTemplate(
    requirements: any[],
    context: Record<string, any>,
  ): Promise<any | null> {
    const key = this.keyGenerator.generateTemplateKey(requirements, context);
    return this.get(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    parameters: Record<string, any>,
    results: any[],
    ttl?: number,
  ): Promise<void> {
    const key = this.keyGenerator.generateSearchKey(query, parameters);
    await this.set(key, results, { ttl, tags: ['search'] });
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    query: string,
    parameters: Record<string, any>,
  ): Promise<any[] | null> {
    const key = this.keyGenerator.generateSearchKey(query, parameters);
    return this.get<any[]>(key);
  }

  /**
   * Invalidate session cache
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const pattern = this.keyGenerator.generateSessionKey(sessionId, '*');
    await this.deleteByPattern(pattern);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: number): Promise<void> {
    const pattern = this.keyGenerator.generateUserKey(userId, '*');
    await this.deleteByPattern(pattern);
  }

  /**
   * Cache conversation for a session
   */
  async cacheConversation(sessionId: string, conversation: any[]): Promise<void> {
    const key = this.keyGenerator.generateSessionKey(sessionId, 'conversation');
    await this.set(key, conversation, { ttl: 3600, tags: ['session', 'conversation'] });
  }

  /**
   * Get cached conversation
   */
  async getCachedConversation(sessionId: string): Promise<any[] | null> {
    const key = this.keyGenerator.generateSessionKey(sessionId, 'conversation');
    return this.get<any[]>(key);
  }

  /**
   * Cache session data
   */
  async cacheSession(session: any): Promise<void> {
    const key = this.keyGenerator.generateSessionKey(session.sessionId || session.getSessionIdString(), 'data');
    await this.set(key, session, { ttl: 3600, tags: ['session'] });
  }

  /**
   * Get cached session
   */
  async getCachedSession(sessionId: string): Promise<any | null> {
    const key = this.keyGenerator.generateSessionKey(sessionId, 'data');
    return this.get(key);
  }

  /**
   * Clear session cache
   */
  async clearSessionCache(sessionId: string): Promise<void> {
    await this.invalidateSession(sessionId);
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  private resetStatistics(): void {
    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.statistics.hits + this.statistics.misses;
    if (total > 0) {
      this.statistics.hitRate = (this.statistics.hits / total) * 100;
    }
  }

  /**
   * Store tags for a key
   */
  private async storeTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const keys = await this.cacheManager.get<string[]>(tagKey) || [];
      
      if (!keys.includes(key)) {
        keys.push(key);
        await this.cacheManager.set(tagKey, keys, this.defaultTTL * 1000);
      }
    }
  }

  /**
   * Warm up cache with frequently used data
   */
  async warmUp(): Promise<void> {
    try {
      this.logger.debug('Cache warm-up started');
      
      // Warm up with common industry templates, best practices, etc.
      // This would be implemented based on actual usage patterns
      
      this.logger.debug('Cache warm-up completed');
    } catch (error) {
      this.logger.error('Cache warm-up failed', error);
    }
  }
}