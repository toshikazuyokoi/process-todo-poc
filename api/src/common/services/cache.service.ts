import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CustomLoggerService } from './logger.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly prefix = 'app:cache:';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.prefix + key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);
      
      await this.redis.setex(this.prefix + key, ttl, serialized);

      // Store tags for invalidation
      if (options?.tags) {
        for (const tag of options.tags) {
          await this.redis.sadd(`tag:${tag}`, this.prefix + key);
          await this.redis.expire(`tag:${tag}`, ttl);
        }
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefix + key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all cached values with a specific tag
   */
  async invalidateTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate tag error for tag ${tag}:`, error);
    }
  }

  /**
   * Delete all cached values matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const stream = this.redis.scanStream({
        match: this.prefix + pattern,
        count: 100,
      });

      const keys: string[] = [];
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      stream.on('end', async () => {
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      });
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async flush(): Promise<void> {
    try {
      await this.invalidatePattern('*');
    } catch (error) {
      this.logger.error('Cache flush error:', error);
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Wrap a function with caching
   */
  cacheable<T>(
    keyGenerator: (...args: any[]) => string,
    options?: CacheOptions,
  ) {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const key = keyGenerator(...args);
        const cacheService = this as any;

        if (!cacheService.cacheService) {
          // No cache service available, execute original method
          return originalMethod.apply(this, args);
        }

        return cacheService.cacheService.getOrSet(
          key,
          () => originalMethod.apply(this, args),
          options,
        );
      };

      return descriptor;
    };
  }

  /**
   * Invalidate cache when method is called
   */
  cacheEvict(
    keyGenerator?: (...args: any[]) => string | string[],
    tags?: string[],
  ) {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const result = await originalMethod.apply(this, args);
        const cacheService = this as any;

        if (cacheService.cacheService) {
          // Invalidate specific keys
          if (keyGenerator) {
            const keys = keyGenerator(...args);
            if (Array.isArray(keys)) {
              for (const key of keys) {
                await cacheService.cacheService.delete(key);
              }
            } else {
              await cacheService.cacheService.delete(keys);
            }
          }

          // Invalidate tags
          if (tags) {
            for (const tag of tags) {
              await cacheService.cacheService.invalidateTag(tag);
            }
          }
        }

        return result;
      };

      return descriptor;
    };
  }
}