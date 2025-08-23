import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * AI Rate Limit Service
 * Manages rate limiting for AI-related operations
 */
@Injectable()
export class AIRateLimitService {
  private readonly logger = new Logger(AIRateLimitService.name);
  private readonly defaultMaxRequests: number;
  private readonly defaultWindowMs: number;
  private readonly enableRedis: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.defaultMaxRequests = this.configService.get<number>('AI_RATE_LIMIT_MAX_REQUESTS', 100);
    this.defaultWindowMs = this.configService.get<number>('AI_RATE_LIMIT_WINDOW_MS', 60000); // 1 minute
    this.enableRedis = this.configService.get<boolean>('AI_RATE_LIMIT_USE_REDIS', true);
  }

  /**
   * Check if a request is allowed based on rate limits
   */
  async checkLimit(config: Partial<RateLimitConfig>): Promise<RateLimitResult> {
    const maxRequests = config.maxRequests || this.defaultMaxRequests;
    const windowMs = config.windowMs || this.defaultWindowMs;
    const identifier = config.identifier || 'default';

    if (!this.enableRedis) {
      return this.checkLimitInMemory(identifier, maxRequests, windowMs);
    }

    return this.checkLimitRedis(identifier, maxRequests, windowMs);
  }

  /**
   * Check rate limit using Redis
   */
  private async checkLimitRedis(
    identifier: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    try {
      const key = `ai-rate-limit:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set to track requests
      const pipeline = this.redis.pipeline();
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Count requests in window
      pipeline.zcard(key);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const requestCount = results[2][1] as number;
      const allowed = requestCount <= maxRequests;
      const remaining = Math.max(0, maxRequests - requestCount);
      const resetAt = new Date(now + windowMs);

      if (!allowed) {
        // Get the oldest request in the window
        const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        if (oldestRequest.length >= 2) {
          const oldestTimestamp = parseInt(oldestRequest[1]);
          const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
          
          this.logger.warn(`Rate limit exceeded for ${identifier}. Retry after ${retryAfter}s`);
          
          return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter,
          };
        }
      }

      this.logger.debug(`Rate limit check for ${identifier}: ${remaining}/${maxRequests} remaining`);

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch (error) {
      this.logger.error('Redis rate limit check failed, falling back to in-memory', error);
      return this.checkLimitInMemory(identifier, maxRequests, windowMs);
    }
  }

  /**
   * In-memory rate limit fallback
   */
  private inMemoryStore = new Map<string, { count: number; resetAt: number }>();

  private checkLimitInMemory(
    identifier: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.inMemoryStore.get(identifier);

    if (!record || record.resetAt <= now) {
      // New window
      this.inMemoryStore.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });

      return Promise.resolve({
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now + windowMs),
      });
    }

    // Existing window
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      
      return Promise.resolve({
        allowed: false,
        remaining: 0,
        resetAt: new Date(record.resetAt),
        retryAfter,
      });
    }

    record.count++;
    
    return Promise.resolve({
      allowed: true,
      remaining: Math.max(0, maxRequests - record.count),
      resetAt: new Date(record.resetAt),
    });
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      if (this.enableRedis) {
        const key = `ai-rate-limit:${identifier}`;
        await this.redis.del(key);
      }
      
      this.inMemoryStore.delete(identifier);
      
      this.logger.debug(`Rate limit reset for ${identifier}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for ${identifier}`, error);
    }
  }

  /**
   * Get current usage for an identifier
   */
  async getUsage(identifier: string): Promise<{ used: number; limit: number; resetAt: Date }> {
    try {
      const maxRequests = this.defaultMaxRequests;
      const windowMs = this.defaultWindowMs;

      if (this.enableRedis) {
        const key = `ai-rate-limit:${identifier}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        await this.redis.zremrangebyscore(key, '-inf', windowStart);
        const used = await this.redis.zcard(key);

        return {
          used,
          limit: maxRequests,
          resetAt: new Date(now + windowMs),
        };
      }

      const record = this.inMemoryStore.get(identifier);
      const now = Date.now();

      if (!record || record.resetAt <= now) {
        return {
          used: 0,
          limit: maxRequests,
          resetAt: new Date(now + windowMs),
        };
      }

      return {
        used: record.count,
        limit: maxRequests,
        resetAt: new Date(record.resetAt),
      };
    } catch (error) {
      this.logger.error(`Failed to get usage for ${identifier}`, error);
      return {
        used: 0,
        limit: this.defaultMaxRequests,
        resetAt: new Date(Date.now() + this.defaultWindowMs),
      };
    }
  }

  /**
   * Clean up expired in-memory records
   */
  cleanupInMemoryStore(): void {
    const now = Date.now();
    for (const [key, record] of this.inMemoryStore.entries()) {
      if (record.resetAt <= now) {
        this.inMemoryStore.delete(key);
      }
    }
  }
}