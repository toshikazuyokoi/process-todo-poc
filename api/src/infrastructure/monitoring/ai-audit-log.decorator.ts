import { SetMetadata } from '@nestjs/common';
import { Logger } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'auditLog';

export enum AuditAction {
  // AI Operations
  AI_GENERATE_RESPONSE = 'AI_GENERATE_RESPONSE',
  AI_GENERATE_TEMPLATE = 'AI_GENERATE_TEMPLATE',
  AI_EXTRACT_ENTITIES = 'AI_EXTRACT_ENTITIES',
  AI_CLASSIFY_INTENT = 'AI_CLASSIFY_INTENT',
  AI_WEB_SEARCH = 'AI_WEB_SEARCH',
  
  // Session Operations
  SESSION_CREATE = 'SESSION_CREATE',
  SESSION_UPDATE = 'SESSION_UPDATE',
  SESSION_DELETE = 'SESSION_DELETE',
  SESSION_EXPIRE = 'SESSION_EXPIRE',
  
  // Template Operations
  TEMPLATE_CREATE = 'TEMPLATE_CREATE',
  TEMPLATE_UPDATE = 'TEMPLATE_UPDATE',
  TEMPLATE_DELETE = 'TEMPLATE_DELETE',
  TEMPLATE_APPROVE = 'TEMPLATE_APPROVE',
  
  // Access Control
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Data Operations
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_DELETE = 'DATA_DELETE',
  
  // Security Events
  SECURITY_ALERT = 'SECURITY_ALERT',
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
}

export interface AuditLogOptions {
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  includeRequest?: boolean;
  includeResponse?: boolean;
  sensitiveFields?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  userId?: number;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  requestBody?: any;
  responseBody?: any;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Audit Log Decorator
 * Records detailed audit logs for AI operations
 */
export function AuditLog(options: AuditLogOptions) {
  return SetMetadata(AUDIT_LOG_KEY, options);
}

/**
 * Audit Log Service
 * Handles the actual logging of audit events
 */
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly auditBuffer: AuditLogEntry[] = [];
  private readonly maxBufferSize = 100;

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedEntry = this.sanitizeEntry(entry);
      
      // Add to buffer
      this.auditBuffer.push(sanitizedEntry);
      
      // Log to console (in production, this would go to a secure audit log storage)
      this.logger.log(`Audit: ${entry.action} by user ${entry.userId || 'anonymous'}`);
      
      // Flush if buffer is full
      if (this.auditBuffer.length >= this.maxBufferSize) {
        await this.flush();
      }
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
    }
  }

  /**
   * Create audit log entry from context
   */
  createEntry(
    action: AuditAction,
    context: any,
    options?: Partial<AuditLogEntry>,
  ): AuditLogEntry {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    
    return {
      id,
      timestamp,
      action,
      success: true,
      ...options,
    };
  }

  /**
   * Sanitize sensitive data from entry
   */
  private sanitizeEntry(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };
    
    // Remove sensitive fields from request body
    if (sanitized.requestBody) {
      sanitized.requestBody = this.removeSensitiveFields(
        sanitized.requestBody,
        ['password', 'token', 'apiKey', 'secret', 'creditCard'],
      );
    }
    
    // Remove sensitive fields from response body
    if (sanitized.responseBody) {
      sanitized.responseBody = this.removeSensitiveFields(
        sanitized.responseBody,
        ['password', 'token', 'apiKey', 'secret'],
      );
    }
    
    return sanitized;
  }

  /**
   * Remove sensitive fields from object
   */
  private removeSensitiveFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const cleaned = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const field of fields) {
      if (field in cleaned) {
        cleaned[field] = '[REDACTED]';
      }
    }
    
    // Recursively clean nested objects
    for (const key in cleaned) {
      if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
        cleaned[key] = this.removeSensitiveFields(cleaned[key], fields);
      }
    }
    
    return cleaned;
  }

  /**
   * Flush audit buffer to persistent storage
   */
  private async flush(): Promise<void> {
    if (this.auditBuffer.length === 0) {
      return;
    }
    
    try {
      const entriesToFlush = [...this.auditBuffer];
      this.auditBuffer.length = 0;
      
      // In production, this would write to a secure audit log storage
      // For now, just log the count
      this.logger.log(`Flushing ${entriesToFlush.length} audit entries`);
      
      // Here you would typically:
      // - Write to database
      // - Send to SIEM system
      // - Store in compliance-approved storage
    } catch (error) {
      this.logger.error('Failed to flush audit buffer', error);
    }
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    userId?: number;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    resourceType?: string;
    resourceId?: string;
    success?: boolean;
  }): Promise<AuditLogEntry[]> {
    // Filter in-memory buffer (in production, query from persistent storage)
    return this.auditBuffer.filter(entry => {
      if (filters.userId && entry.userId !== filters.userId) {
        return false;
      }
      
      if (filters.action && entry.action !== filters.action) {
        return false;
      }
      
      if (filters.startDate && entry.timestamp < filters.startDate) {
        return false;
      }
      
      if (filters.endDate && entry.timestamp > filters.endDate) {
        return false;
      }
      
      if (filters.resourceType && entry.resourceType !== filters.resourceType) {
        return false;
      }
      
      if (filters.resourceId && entry.resourceId !== filters.resourceId) {
        return false;
      }
      
      if (filters.success !== undefined && entry.success !== filters.success) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Generate audit report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    groupBy: 'action' | 'user' | 'resource' = 'action',
  ): Promise<any> {
    const entries = await this.query({ startDate, endDate });
    
    const report: any = {
      period: { start: startDate, end: endDate },
      totalEntries: entries.length,
      successfulOperations: entries.filter(e => e.success).length,
      failedOperations: entries.filter(e => !e.success).length,
      breakdown: {},
    };
    
    // Group entries
    if (groupBy === 'action') {
      report.breakdown = entries.reduce((acc, entry) => {
        if (!acc[entry.action]) {
          acc[entry.action] = { count: 0, success: 0, failed: 0 };
        }
        acc[entry.action].count++;
        if (entry.success) {
          acc[entry.action].success++;
        } else {
          acc[entry.action].failed++;
        }
        return acc;
      }, {} as Record<string, any>);
    } else if (groupBy === 'user') {
      report.breakdown = entries.reduce((acc, entry) => {
        const key = entry.userId || 'anonymous';
        if (!acc[key]) {
          acc[key] = { count: 0, actions: {} };
        }
        acc[key].count++;
        if (!acc[key].actions[entry.action]) {
          acc[key].actions[entry.action] = 0;
        }
        acc[key].actions[entry.action]++;
        return acc;
      }, {} as Record<string, any>);
    } else if (groupBy === 'resource') {
      report.breakdown = entries.reduce((acc, entry) => {
        const key = entry.resourceType || 'unknown';
        if (!acc[key]) {
          acc[key] = { count: 0, resources: new Set() };
        }
        acc[key].count++;
        if (entry.resourceId) {
          acc[key].resources.add(entry.resourceId);
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Convert sets to counts
      for (const key in report.breakdown) {
        report.breakdown[key].uniqueResources = report.breakdown[key].resources.size;
        delete report.breakdown[key].resources;
      }
    }
    
    return report;
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const initialLength = this.auditBuffer.length;
    const retained = this.auditBuffer.filter(entry => entry.timestamp > cutoffDate);
    
    this.auditBuffer.length = 0;
    this.auditBuffer.push(...retained);
    
    const deleted = initialLength - retained.length;
    
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} old audit entries`);
    }
    
    return deleted;
  }

  /**
   * Get logs with optional filter
   */
  getLogs(filter?: Partial<AuditLogEntry>): AuditLogEntry[] {
    if (!filter) {
      return [...this.auditBuffer];
    }
    
    return this.auditBuffer.filter(entry => {
      return Object.entries(filter).every(([key, value]) => {
        return entry[key as keyof AuditLogEntry] === value;
      });
    });
  }

  /**
   * Clear all logs (for testing)
   */
  clearLogs(): void {
    this.auditBuffer.length = 0;
  }
}