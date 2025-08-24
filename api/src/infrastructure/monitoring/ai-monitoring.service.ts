import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsService } from './metrics.service';

export enum AIOperationType {
  GENERATE_RESPONSE = 'generate_response',
  GENERATE_TEMPLATE = 'generate_template',
  EXTRACT_ENTITIES = 'extract_entities',
  CLASSIFY_INTENT = 'classify_intent',
  WEB_SEARCH = 'web_search',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
}

export enum AIOperationStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  RATE_LIMITED = 'rate_limited',
  TIMEOUT = 'timeout',
}

export interface AIMetrics {
  operationType: AIOperationType;
  status: AIOperationStatus;
  duration: number;
  tokensUsed?: number;
  cost?: number;
  userId?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

export interface AIAlert {
  type: 'rate_limit' | 'error_rate' | 'cost_threshold' | 'response_time';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * AI Monitoring Service
 * Tracks and monitors AI service usage, performance, and costs
 */
@Injectable()
export class AIMonitoringService {
  private readonly logger = new Logger(AIMonitoringService.name);
  private readonly metricsBuffer: AIMetrics[] = [];
  private readonly maxBufferSize: number;
  private readonly flushInterval: number;
  private flushTimer?: NodeJS.Timeout;
  
  // In-memory statistics
  private stats: Map<string, AIUsageStats> = new Map();
  
  // Alert thresholds
  private readonly errorRateThreshold: number;
  private readonly costThreshold: number;
  private readonly responseTimeThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: MetricsService,
  ) {
    this.maxBufferSize = this.configService.get<number>('AI_MONITORING_BUFFER_SIZE', 100);
    this.flushInterval = this.configService.get<number>('AI_MONITORING_FLUSH_INTERVAL', 60000); // 1 minute
    this.errorRateThreshold = this.configService.get<number>('AI_ALERT_ERROR_RATE', 0.1); // 10%
    this.costThreshold = this.configService.get<number>('AI_ALERT_COST_THRESHOLD', 100); // $100
    this.responseTimeThreshold = this.configService.get<number>('AI_ALERT_RESPONSE_TIME', 5000); // 5 seconds
    
    this.startFlushTimer();
  }

  /**
   * Record an AI operation metric
   */
  async recordMetric(metric: AIMetrics): Promise<void> {
    try {
      // Add to buffer
      this.metricsBuffer.push(metric);
      
      // Update in-memory stats
      this.updateStats(metric);
      
      // Check for alerts
      await this.checkAlerts(metric);
      
      // Emit event for real-time monitoring
      this.eventEmitter.emit('ai.metrics', metric);
      
      // Flush if buffer is full
      if (this.metricsBuffer.length >= this.maxBufferSize) {
        await this.flushMetrics();
      }
      
      this.logger.debug(`Recorded metric: ${metric.operationType} - ${metric.status}`);
    } catch (error) {
      this.logger.error('Failed to record metric', error);
    }
  }

  /**
   * Record operation start
   */
  startOperation(operationType: AIOperationType, metadata?: Record<string, any>): string {
    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.eventEmitter.emit('ai.operation.start', {
      operationId,
      operationType,
      metadata,
      startTime: Date.now(),
    });
    
    return operationId;
  }

  /**
   * Record operation end
   */
  async endOperation(
    operationId: string,
    status: AIOperationStatus,
    additionalData?: Partial<AIMetrics>,
  ): Promise<void> {
    const endTime = Date.now();
    
    this.eventEmitter.emit('ai.operation.end', {
      operationId,
      status,
      endTime,
      ...additionalData,
    });
  }

  /**
   * Get usage statistics
   */
  getStats(userId?: number): AIUsageStats {
    const key = userId ? `user-${userId}` : 'global';
    
    if (!this.stats.has(key)) {
      this.stats.set(key, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
      });
    }
    
    return this.stats.get(key)!;
  }

  /**
   * Get metrics for a time range
   */
  getMetrics(
    startTime: Date,
    endTime: Date,
    filters?: {
      userId?: number;
      operationType?: AIOperationType;
      status?: AIOperationStatus;
    },
  ): AIMetrics[] {
    return this.metricsBuffer.filter(metric => {
      if (metric.timestamp < startTime || metric.timestamp > endTime) {
        return false;
      }
      
      if (filters?.userId && metric.userId !== filters.userId) {
        return false;
      }
      
      if (filters?.operationType && metric.operationType !== filters.operationType) {
        return false;
      }
      
      if (filters?.status && metric.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(tokensUsed: number, model: string = 'gpt-4'): number {
    // Cost per 1000 tokens (example rates)
    const costRates: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };
    
    const rate = costRates[model] || costRates['gpt-4'];
    // Simplified calculation (assuming 50/50 input/output split)
    return (tokensUsed / 1000) * ((rate.input + rate.output) / 2);
  }

  /**
   * Update statistics
   */
  private updateStats(metric: AIMetrics): void {
    // Update global stats
    const globalStats = this.getStats();
    
    globalStats.totalRequests++;
    
    if (metric.status === AIOperationStatus.SUCCESS) {
      globalStats.successfulRequests++;
    } else {
      globalStats.failedRequests++;
    }
    
    if (metric.tokensUsed) {
      globalStats.totalTokens += metric.tokensUsed;
    }
    
    if (metric.cost) {
      globalStats.totalCost += metric.cost;
    }
    
    // Also update user-specific stats if userId is present
    if (metric.userId) {
      const userStats = this.getStats(metric.userId);
      
      userStats.totalRequests++;
      
      if (metric.status === AIOperationStatus.SUCCESS) {
        userStats.successfulRequests++;
      } else {
        userStats.failedRequests++;
      }
      
      if (metric.tokensUsed) {
        userStats.totalTokens += metric.tokensUsed;
      }
      
      if (metric.cost) {
        userStats.totalCost += metric.cost;
      }
    }
    
    // Update average response time
    if (metric.duration) {
      const prevAvg = globalStats.averageResponseTime;
      const prevCount = globalStats.totalRequests - 1;
      globalStats.averageResponseTime = (prevAvg * prevCount + metric.duration) / globalStats.totalRequests;
    }
    
    // Update cache hit rate
    if (metric.operationType === AIOperationType.CACHE_HIT || 
        metric.operationType === AIOperationType.CACHE_MISS) {
      const cacheRequests = this.metricsBuffer.filter(m => 
        m.operationType === AIOperationType.CACHE_HIT || 
        m.operationType === AIOperationType.CACHE_MISS
      );
      const cacheHits = cacheRequests.filter(m => m.operationType === AIOperationType.CACHE_HIT);
      globalStats.cacheHitRate = cacheRequests.length > 0 
        ? (cacheHits.length / cacheRequests.length) * 100 
        : 0;
    }
  }

  /**
   * Check for alerts
   */
  private async checkAlerts(metric: AIMetrics): Promise<void> {
    const alerts: AIAlert[] = [];
    
    // Check error rate (use global stats for overall monitoring)
    const globalStats = this.getStats();
    const userStats = metric.userId ? this.getStats(metric.userId) : globalStats;
    
    const errorRate = userStats.totalRequests > 0 
      ? (userStats.failedRequests / userStats.totalRequests) 
      : 0;
    
    if (errorRate > this.errorRateThreshold) {
      alerts.push({
        type: 'error_rate',
        severity: errorRate > 0.5 ? 'critical' : errorRate > 0.3 ? 'high' : 'medium',
        message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        metadata: { errorRate, userId: metric.userId },
        timestamp: new Date(),
      });
    }
    
    // Check response time
    if (metric.duration && metric.duration > this.responseTimeThreshold) {
      alerts.push({
        type: 'response_time',
        severity: metric.duration > 10000 ? 'high' : 'medium',
        message: `Slow response time: ${metric.duration}ms`,
        metadata: { duration: metric.duration, operationType: metric.operationType },
        timestamp: new Date(),
      });
    }
    
    // Check cost threshold - trigger once when crossing threshold
    const prevTotalCost = globalStats.totalCost - (metric.cost || 0);
    if (prevTotalCost <= this.costThreshold && globalStats.totalCost > this.costThreshold) {
      alerts.push({
        type: 'cost_threshold',
        severity: globalStats.totalCost > this.costThreshold * 2 ? 'critical' : 'high',
        message: `Cost threshold exceeded: $${globalStats.totalCost.toFixed(2)}`,
        metadata: { totalCost: globalStats.totalCost, userId: metric.userId },
        timestamp: new Date(),
      });
    }
    
    // Check rate limiting
    if (metric.status === AIOperationStatus.RATE_LIMITED) {
      alerts.push({
        type: 'rate_limit',
        severity: 'medium',
        message: 'Rate limit reached for AI operations',
        metadata: { userId: metric.userId, sessionId: metric.sessionId },
        timestamp: new Date(),
      });
    }
    
    // Emit alerts
    for (const alert of alerts) {
      this.logger.warn(`Alert: ${alert.type} - ${alert.message}`);
      this.eventEmitter.emit('ai.alert', alert);
    }
  }

  /**
   * Flush metrics to persistent storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }
    
    try {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer.length = 0;
      
      // In production, this would write to a time-series database
      // For now, just log summary
      this.logger.log(`Flushing ${metricsToFlush.length} metrics`);
      
      this.eventEmitter.emit('ai.metrics.flush', metricsToFlush);
    } catch (error) {
      this.logger.error('Failed to flush metrics', error);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics().catch(error => {
        this.logger.error('Periodic flush failed', error);
      });
    }, this.flushInterval);
  }

  /**
   * Log usage (alias for logAIRequest for compatibility)
   */
  logUsage(userId: number, tokens: number, cost: number): void {
    this.logAIRequest(userId, 'general', tokens, cost);
  }

  /**
   * Log AI request with metrics
   */
  logAIRequest(userId: number, action: string, tokens: number, cost: number): void {
    this.logger.log('AI request', {
      userId,
      action,
      tokens,
      cost,
      timestamp: new Date().toISOString(),
    });

    // メトリクス記録
    this.metricsService.incrementCounter('ai_requests_total', { action });
    this.metricsService.recordHistogram('ai_tokens_used', tokens, { action });
    this.metricsService.recordHistogram('ai_cost_usd', cost, { action });
  }

  /**
   * Log AI error with metrics
   */
  logAIError(userId: number, action: string, error: Error): void {
    this.logger.error('AI request failed', {
      userId,
      action,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    this.metricsService.incrementCounter('ai_errors_total', { action, error: error.name });
  }

  /**
   * Clean up resources
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    this.flushMetrics().catch(error => {
      this.logger.error('Final flush failed', error);
    });
  }

  /**
   * Generate usage report
   */
  generateReport(userId?: number, period?: { start: Date; end: Date }): any {
    const stats = this.getStats(userId);
    const metrics = period 
      ? this.getMetrics(period.start, period.end, { userId })
      : this.metricsBuffer.filter(m => !userId || m.userId === userId);
    
    const operationBreakdown = metrics.reduce((acc, metric) => {
      if (!acc[metric.operationType]) {
        acc[metric.operationType] = { count: 0, totalDuration: 0, totalTokens: 0 };
      }
      acc[metric.operationType].count++;
      acc[metric.operationType].totalDuration += metric.duration || 0;
      acc[metric.operationType].totalTokens += metric.tokensUsed || 0;
      return acc;
    }, {} as Record<string, any>);
    
    return {
      summary: stats,
      operationBreakdown,
      period: period || { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
      generatedAt: new Date(),
    };
  }
}