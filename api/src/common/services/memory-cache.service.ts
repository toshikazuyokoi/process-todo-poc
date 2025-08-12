import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from './logger.service';

interface CacheEntry<T> {
  value: T;
  expiry: number;
  tags?: string[];
}

@Injectable()
export class MemoryCacheService {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly logger: CustomLoggerService) {
    // 1分ごとに期限切れエントリをクリーンアップ
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl: number = 3600, tags?: string[]): void {
    const expiry = Date.now() + ttl * 1000;
    
    // 既存のエントリがある場合は、タグインデックスから削除
    const existingEntry = this.cache.get(key);
    if (existingEntry?.tags) {
      this.removeFromTagIndex(key, existingEntry.tags);
    }

    // 新しいエントリを追加
    this.cache.set(key, { value, expiry, tags });

    // タグインデックスに追加
    if (tags) {
      this.addToTagIndex(key, tags);
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    
    if (entry) {
      // タグインデックスから削除
      if (entry.tags) {
        this.removeFromTagIndex(key, entry.tags);
      }
      
      this.cache.delete(key);
    }
  }

  /**
   * Delete all cached values with a specific tag
   */
  invalidateTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    
    if (keys) {
      keys.forEach(key => this.delete(key));
      this.tagIndex.delete(tag);
    }
  }

  /**
   * Clear all cache
   */
  flush(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    tags: number;
    memoryUsage: number;
  } {
    let memoryUsage = 0;
    
    // 簡易的なメモリ使用量推定
    this.cache.forEach((entry) => {
      const valueStr = JSON.stringify(entry.value);
      memoryUsage += valueStr.length * 2; // 文字列は約2バイト/文字
    });

    return {
      size: this.cache.size,
      tags: this.tagIndex.size,
      memoryUsage: Math.round(memoryUsage / 1024), // KB単位
    };
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number,
    tags?: string[],
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    this.set(key, value, ttl, tags);

    return value;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        this.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Add key to tag index
   */
  private addToTagIndex(key: string, tags: string[]): void {
    tags.forEach(tag => {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set<string>();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    });
  }

  /**
   * Remove key from tag index
   */
  private removeFromTagIndex(key: string, tags: string[]): void {
    tags.forEach(tag => {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });
  }

  /**
   * Decorator for method-level caching
   */
  static Cacheable(ttl: number = 3600, keyPrefix?: string) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheService = (this as any).memoryCacheService;
        
        if (!cacheService) {
          // No cache service available
          return originalMethod.apply(this, args);
        }

        // Generate cache key
        const key = keyPrefix || `${target.constructor.name}:${propertyKey}`;
        const cacheKey = `${key}:${JSON.stringify(args)}`;

        return cacheService.getOrSet(
          cacheKey,
          () => originalMethod.apply(this, args),
          ttl,
        );
      };

      return descriptor;
    };
  }

  /**
   * Decorator for cache invalidation
   */
  static CacheEvict(tags?: string[]) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const result = await originalMethod.apply(this, args);
        const cacheService = (this as any).memoryCacheService;

        if (cacheService && tags) {
          tags.forEach(tag => cacheService.invalidateTag(tag));
        }

        return result;
      };

      return descriptor;
    };
  }
}