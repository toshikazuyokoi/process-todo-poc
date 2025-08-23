import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum DataCategory {
  PERSONAL = 'personal',
  SENSITIVE = 'sensitive',
  CONFIDENTIAL = 'confidential',
  PUBLIC = 'public',
  INTERNAL = 'internal',
}

export enum PrivacyAction {
  ANONYMIZE = 'anonymize',
  PSEUDONYMIZE = 'pseudonymize',
  ENCRYPT = 'encrypt',
  REDACT = 'redact',
  MASK = 'mask',
}

export interface PrivacyRule {
  pattern: RegExp | string;
  category: DataCategory;
  action: PrivacyAction;
  replacement?: string;
}

export interface DataRetentionPolicy {
  category: DataCategory;
  retentionDays: number;
  deleteAction: 'delete' | 'anonymize' | 'archive';
}

/**
 * Privacy Manager Service
 * Manages data privacy, anonymization, and compliance for AI operations
 */
@Injectable()
export class PrivacyManagerService {
  private readonly logger = new Logger(PrivacyManagerService.name);
  private readonly privacyRules: PrivacyRule[] = [];
  private readonly retentionPolicies: Map<DataCategory, DataRetentionPolicy> = new Map();
  private readonly anonymizationSalt: string;

  constructor(private readonly configService: ConfigService) {
    this.anonymizationSalt = this.configService.get<string>('PRIVACY_ANONYMIZATION_SALT', 'default-salt');
    this.initializeRules();
    this.initializeRetentionPolicies();
  }

  /**
   * Initialize privacy rules
   */
  private initializeRules(): void {
    // Email addresses
    this.privacyRules.push({
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      category: DataCategory.PERSONAL,
      action: PrivacyAction.MASK,
      replacement: '***@***.***',
    });

    // Phone numbers
    this.privacyRules.push({
      pattern: /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/g,
      category: DataCategory.PERSONAL,
      action: PrivacyAction.MASK,
      replacement: '***-***-****',
    });

    // Credit card numbers
    this.privacyRules.push({
      pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      category: DataCategory.SENSITIVE,
      action: PrivacyAction.REDACT,
      replacement: '[REDACTED]',
    });

    // Social Security Numbers
    this.privacyRules.push({
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      category: DataCategory.SENSITIVE,
      action: PrivacyAction.REDACT,
      replacement: '[SSN-REDACTED]',
    });

    // IP addresses
    this.privacyRules.push({
      pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      category: DataCategory.INTERNAL,
      action: PrivacyAction.ANONYMIZE,
    });

    // API keys and tokens
    this.privacyRules.push({
      pattern: /\b(api[_-]?key|token|secret|password)[\s]*[:=][\s]*["']?([^"'\s]+)["']?/gi,
      category: DataCategory.CONFIDENTIAL,
      action: PrivacyAction.REDACT,
      replacement: '$1=[REDACTED]',
    });

    // Names (simple pattern - may need refinement)
    this.privacyRules.push({
      pattern: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
      category: DataCategory.PERSONAL,
      action: PrivacyAction.PSEUDONYMIZE,
    });

    this.logger.log(`Initialized ${this.privacyRules.length} privacy rules`);
  }

  /**
   * Initialize data retention policies
   */
  private initializeRetentionPolicies(): void {
    this.retentionPolicies.set(DataCategory.PERSONAL, {
      category: DataCategory.PERSONAL,
      retentionDays: 365, // 1 year
      deleteAction: 'anonymize',
    });

    this.retentionPolicies.set(DataCategory.SENSITIVE, {
      category: DataCategory.SENSITIVE,
      retentionDays: 90, // 3 months
      deleteAction: 'delete',
    });

    this.retentionPolicies.set(DataCategory.CONFIDENTIAL, {
      category: DataCategory.CONFIDENTIAL,
      retentionDays: 730, // 2 years
      deleteAction: 'archive',
    });

    this.retentionPolicies.set(DataCategory.INTERNAL, {
      category: DataCategory.INTERNAL,
      retentionDays: 180, // 6 months
      deleteAction: 'delete',
    });

    this.retentionPolicies.set(DataCategory.PUBLIC, {
      category: DataCategory.PUBLIC,
      retentionDays: -1, // No expiration
      deleteAction: 'delete',
    });
  }

  /**
   * Apply privacy rules to text
   */
  applyPrivacyRules(text: string, category?: DataCategory): string {
    let processed = text;
    
    for (const rule of this.privacyRules) {
      // Always apply privacy rules regardless of category
      // Personal information should always be protected

      processed = this.applyRule(processed, rule);
    }

    return processed;
  }

  /**
   * Apply a single privacy rule
   */
  private applyRule(text: string, rule: PrivacyRule): string {
    const pattern = typeof rule.pattern === 'string' 
      ? new RegExp(rule.pattern, 'g')
      : rule.pattern;

    switch (rule.action) {
      case PrivacyAction.REDACT:
        return text.replace(pattern, rule.replacement || '[REDACTED]');
      
      case PrivacyAction.MASK:
        return text.replace(pattern, rule.replacement || '***');
      
      case PrivacyAction.ANONYMIZE:
        return text.replace(pattern, (match) => this.anonymize(match));
      
      case PrivacyAction.PSEUDONYMIZE:
        return text.replace(pattern, (match) => this.pseudonymize(match));
      
      case PrivacyAction.ENCRYPT:
        // Encryption would be handled by DataEncryptionService
        return text.replace(pattern, '[ENCRYPTED]');
      
      default:
        return text;
    }
  }

  /**
   * Anonymize data
   */
  anonymize(data: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(data + this.anonymizationSalt);
    const hashed = hash.digest('hex');
    
    // Return a shorter, more readable anonymized version
    return `ANON_${hashed.substring(0, 8)}`;
  }

  /**
   * Pseudonymize data
   */
  pseudonymize(data: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(data + this.anonymizationSalt);
    const hashed = hash.digest('hex');
    
    // Generate a consistent pseudonym
    const adjectives = ['Happy', 'Clever', 'Bright', 'Swift', 'Calm'];
    const nouns = ['Eagle', 'Tiger', 'Dolphin', 'Fox', 'Hawk'];
    
    const adjIndex = parseInt(hashed.substring(0, 2), 16) % adjectives.length;
    const nounIndex = parseInt(hashed.substring(2, 4), 16) % nouns.length;
    const number = parseInt(hashed.substring(4, 6), 16);
    
    return `${adjectives[adjIndex]}${nouns[nounIndex]}${number}`;
  }

  /**
   * Check if data should be retained
   */
  shouldRetain(category: DataCategory, createdAt: Date): boolean {
    const policy = this.retentionPolicies.get(category);
    
    if (!policy || policy.retentionDays === -1) {
      return true; // No expiration
    }

    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);
    
    return new Date() < expirationDate;
  }

  /**
   * Get retention policy for a category
   */
  getRetentionPolicy(category: DataCategory): DataRetentionPolicy | undefined {
    return this.retentionPolicies.get(category);
  }

  /**
   * Process data for deletion based on retention policies
   */
  async processRetention(
    data: any[],
    getCategoryFn: (item: any) => DataCategory,
    getCreatedAtFn: (item: any) => Date,
  ): Promise<{
    retained: any[];
    deleted: any[];
    anonymized: any[];
    archived: any[];
  }> {
    const result = {
      retained: [] as any[],
      deleted: [] as any[],
      anonymized: [] as any[],
      archived: [] as any[],
    };

    for (const item of data) {
      const category = getCategoryFn(item);
      const createdAt = getCreatedAtFn(item);
      
      if (this.shouldRetain(category, createdAt)) {
        result.retained.push(item);
      } else {
        const policy = this.retentionPolicies.get(category);
        
        if (policy) {
          switch (policy.deleteAction) {
            case 'delete':
              result.deleted.push(item);
              break;
            case 'anonymize':
              const anonymized = await this.anonymizeObject(item);
              result.anonymized.push(anonymized);
              break;
            case 'archive':
              result.archived.push(item);
              break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Anonymize an object
   */
  async anonymizeObject(obj: any): Promise<any> {
    if (typeof obj === 'string') {
      return this.anonymize(obj);
    }

    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => this.anonymizeObject(item)));
    }

    if (typeof obj === 'object' && obj !== null) {
      const anonymized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // Skip certain fields
        if (['id', 'createdAt', 'updatedAt'].includes(key)) {
          anonymized[key] = value;
        } else if (typeof value === 'string') {
          anonymized[key] = this.applyPrivacyRules(value);
        } else {
          anonymized[key] = await this.anonymizeObject(value);
        }
      }
      
      return anonymized;
    }

    return obj;
  }

  /**
   * Detect sensitive data in text
   */
  detectSensitiveData(text: string): {
    found: boolean;
    categories: DataCategory[];
    matches: Array<{ pattern: string; category: DataCategory }>;
  } {
    const matches: Array<{ pattern: string; category: DataCategory }> = [];
    const categories = new Set<DataCategory>();

    for (const rule of this.privacyRules) {
      const pattern = typeof rule.pattern === 'string' 
        ? new RegExp(rule.pattern, 'g')
        : rule.pattern;

      const found = text.match(pattern);
      
      if (found && found.length > 0) {
        categories.add(rule.category);
        matches.push({
          pattern: found[0].substring(0, 20) + (found[0].length > 20 ? '...' : ''),
          category: rule.category,
        });
      }
    }

    return {
      found: matches.length > 0,
      categories: Array.from(categories),
      matches,
    };
  }

  /**
   * Get category sensitivity level
   */
  private getCategorySensitivity(category: DataCategory): number {
    const levels: Record<DataCategory, number> = {
      [DataCategory.PUBLIC]: 0,
      [DataCategory.INTERNAL]: 1,
      [DataCategory.PERSONAL]: 2,
      [DataCategory.CONFIDENTIAL]: 3,
      [DataCategory.SENSITIVE]: 4,
    };

    return levels[category] || 0;
  }

  /**
   * Generate privacy report
   */
  generatePrivacyReport(
    data: any[],
    getCategoryFn: (item: any) => DataCategory,
  ): {
    totalItems: number;
    categoryCounts: Record<DataCategory, number>;
    sensitiveDataFound: number;
    complianceStatus: 'compliant' | 'review_needed' | 'non_compliant';
  } {
    const categoryCounts: Record<string, number> = {};
    let sensitiveDataFound = 0;

    for (const item of data) {
      const category = getCategoryFn(item);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      // Check for sensitive data
      const text = JSON.stringify(item);
      const detection = this.detectSensitiveData(text);
      
      if (detection.found) {
        sensitiveDataFound++;
      }
    }

    // Determine compliance status
    const sensitivePercentage = (sensitiveDataFound / data.length) * 100;
    let complianceStatus: 'compliant' | 'review_needed' | 'non_compliant';
    
    if (sensitivePercentage < 5) {
      complianceStatus = 'compliant';
    } else if (sensitivePercentage < 20) {
      complianceStatus = 'review_needed';
    } else {
      complianceStatus = 'non_compliant';
    }

    return {
      totalItems: data.length,
      categoryCounts: categoryCounts as Record<DataCategory, number>,
      sensitiveDataFound,
      complianceStatus,
    };
  }

  /**
   * Validate privacy compliance
   */
  validateCompliance(data: any): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Check for sensitive data
    const detection = this.detectSensitiveData(text);
    
    if (detection.found) {
      for (const match of detection.matches) {
        issues.push(`Found ${match.category} data: ${match.pattern}`);
      }
      
      if (detection.categories.includes(DataCategory.SENSITIVE)) {
        recommendations.push('Apply encryption before storage');
        recommendations.push('Implement access controls');
      }
      
      if (detection.categories.includes(DataCategory.PERSONAL)) {
        recommendations.push('Consider anonymization or pseudonymization');
        recommendations.push('Ensure GDPR compliance');
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }
}