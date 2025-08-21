import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: Date;
  firstRequestTime: Date;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly limitStore: Map<string, RateLimitEntry> = new Map();
  private readonly defaultMaxRequests: number;
  private readonly defaultWindowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultMaxRequests = this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100);
    this.defaultWindowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 3600000); // 1 hour

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Check if a request is allowed under the rate limit
   */
  async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    const key = this.generateKey(config.identifier);
    const entry = this.limitStore.get(key);

    // No previous requests or window expired
    if (!entry || entry.resetTime < now) {
      this.limitStore.set(key, {
        count: 1,
        resetTime: new Date(now.getTime() + config.windowMs),
        firstRequestTime: now,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowMs),
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime.getTime() - now.getTime()) / 1000);
      
      this.logger.warn(`Rate limit exceeded for ${config.identifier}`);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }

    // Increment counter
    entry.count++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Consume a token from the rate limit bucket
   */
  async consume(
    identifier: string,
    maxRequests: number = this.defaultMaxRequests,
    windowMs: number = this.defaultWindowMs,
  ): Promise<RateLimitResult> {
    return this.checkLimit({
      identifier,
      maxRequests,
      windowMs,
    });
  }

  /**
   * Check remaining quota without consuming
   */
  async getRemaining(
    identifier: string,
    maxRequests: number = this.defaultMaxRequests,
  ): Promise<number> {
    const key = this.generateKey(identifier);
    const entry = this.limitStore.get(key);
    const now = new Date();

    if (!entry || entry.resetTime < now) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.generateKey(identifier);
    this.limitStore.delete(key);
    this.logger.debug(`Rate limit reset for ${identifier}`);
  }

  /**
   * Apply sliding window rate limiting
   */
  async checkSlidingWindow(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    const key = `sliding:${this.generateKey(config.identifier)}`;
    const entry = this.limitStore.get(key);

    if (!entry) {
      this.limitStore.set(key, {
        count: 1,
        resetTime: new Date(now.getTime() + config.windowMs),
        firstRequestTime: now,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowMs),
      };
    }

    // Calculate the weighted count based on time passed
    const timePassed = now.getTime() - entry.firstRequestTime.getTime();
    const windowProgress = Math.min(1, timePassed / config.windowMs);
    const weightedCount = entry.count * (1 - windowProgress);

    if (weightedCount >= config.maxRequests) {
      const retryAfter = Math.ceil(config.windowMs * (1 - windowProgress) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now.getTime() + retryAfter * 1000),
        retryAfter,
      };
    }

    entry.count++;
    
    return {
      allowed: true,
      remaining: Math.floor(config.maxRequests - weightedCount - 1),
      resetTime: new Date(entry.firstRequestTime.getTime() + config.windowMs),
    };
  }

  /**
   * Create a distributed rate limiter using Redis (if available)
   */
  async checkDistributed(
    config: RateLimitConfig,
    redisClient?: any,
  ): Promise<RateLimitResult> {
    if (!redisClient) {
      // Fallback to local rate limiting
      return this.checkLimit(config);
    }

    const key = `rate_limit:${config.identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis sorted set for sliding window
      await redisClient.zremrangebyscore(key, '-inf', windowStart);
      const count = await redisClient.zcard(key);

      if (count >= config.maxRequests) {
        const oldestEntry = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
        const retryAfter = Math.ceil((parseInt(oldestEntry[1]) + config.windowMs - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(parseInt(oldestEntry[1]) + config.windowMs),
          retryAfter,
        };
      }

      await redisClient.zadd(key, now, `${now}-${Math.random()}`);
      await redisClient.expire(key, Math.ceil(config.windowMs / 1000));

      return {
        allowed: true,
        remaining: config.maxRequests - count - 1,
        resetTime: new Date(now + config.windowMs),
      };
    } catch (error) {
      this.logger.error('Distributed rate limit check failed', error);
      // Fallback to local rate limiting
      return this.checkLimit(config);
    }
  }

  /**
   * Get rate limit statistics
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {
      totalEntries: this.limitStore.size,
      entries: [],
    };

    for (const [key, entry] of this.limitStore.entries()) {
      stats.entries.push({
        key,
        count: entry.count,
        resetTime: entry.resetTime.toISOString(),
        firstRequestTime: entry.firstRequestTime.toISOString(),
      });
    }

    return stats;
  }

  private generateKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  private cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.limitStore.entries()) {
      if (entry.resetTime < now) {
        this.limitStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}