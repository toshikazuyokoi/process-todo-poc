import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Cache Key Generator Service
 * AIキャッシュのキー生成戦略を管理
 */
@Injectable()
export class CacheKeyGenerator {
  private readonly PREFIX = 'ai:';

  /**
   * Generate cache key for AI response
   */
  generateResponseKey(prompt: string, context: Record<string, any>): string {
    const hash = this.hashObject({ prompt, context });
    return `${this.PREFIX}response:${hash}`;
  }

  /**
   * Generate cache key for template generation
   */
  generateTemplateKey(
    requirements: any[],
    context: Record<string, any>,
  ): string {
    const hash = this.hashObject({ requirements, context });
    return `${this.PREFIX}template:${hash}`;
  }

  /**
   * Generate cache key for entity extraction
   */
  generateEntityKey(text: string): string {
    const hash = this.hashString(text);
    return `${this.PREFIX}entity:${hash}`;
  }

  /**
   * Generate cache key for intent classification
   */
  generateIntentKey(message: string): string {
    const hash = this.hashString(message);
    return `${this.PREFIX}intent:${hash}`;
  }

  /**
   * Generate cache key for text summarization
   */
  generateSummaryKey(text: string, maxLength: number): string {
    const hash = this.hashString(text + maxLength);
    return `${this.PREFIX}summary:${hash}`;
  }

  /**
   * Generate cache key for web search results
   */
  generateSearchKey(query: string, parameters: Record<string, any>): string {
    const hash = this.hashObject({ query, parameters });
    return `${this.PREFIX}search:${hash}`;
  }

  /**
   * Generate cache key for best practices
   */
  generateBestPracticesKey(industry: string, processType: string): string {
    return `${this.PREFIX}best-practices:${industry}:${processType}`;
  }

  /**
   * Generate cache key for compliance requirements
   */
  generateComplianceKey(industry: string, region: string): string {
    return `${this.PREFIX}compliance:${industry}:${region}`;
  }

  /**
   * Generate cache key for benchmarks
   */
  generateBenchmarksKey(processType: string): string {
    return `${this.PREFIX}benchmarks:${processType}`;
  }

  /**
   * Generate cache key for session data
   */
  generateSessionKey(sessionId: string, dataType: string): string {
    return `${this.PREFIX}session:${sessionId}:${dataType}`;
  }

  /**
   * Generate cache key for user-specific data
   */
  generateUserKey(userId: number, dataType: string): string {
    return `${this.PREFIX}user:${userId}:${dataType}`;
  }

  /**
   * Generate cache key for knowledge base
   */
  generateKnowledgeKey(category: string, identifier: string): string {
    return `${this.PREFIX}knowledge:${category}:${identifier}`;
  }

  /**
   * Generate pattern for bulk operations
   */
  generatePattern(prefix: string): string {
    return `${this.PREFIX}${prefix}:*`;
  }

  /**
   * Parse cache key to extract components
   */
  parseKey(key: string): {
    prefix: string;
    type: string;
    identifier: string;
  } {
    const parts = key.split(':');
    
    if (parts.length < 3) {
      throw new Error(`Invalid cache key format: ${key}`);
    }

    return {
      prefix: parts[0],
      type: parts[1],
      identifier: parts.slice(2).join(':'),
    };
  }

  /**
   * Check if key matches pattern
   */
  matchesPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Generate hash for an object
   */
  private hashObject(obj: any): string {
    const json = JSON.stringify(this.sortObject(obj));
    return this.hashString(json);
  }

  /**
   * Generate hash for a string
   */
  private hashString(str: string): string {
    return crypto
      .createHash('sha256')
      .update(str)
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for brevity
  }

  /**
   * Sort object keys recursively for consistent hashing
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    const sorted: any = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = this.sortObject(obj[key]);
    }

    return sorted;
  }
}