import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export interface MetricOptions {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
  buckets?: number[]; // For histogram
  percentiles?: number[]; // For summary
  unit?: string;
}

export interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export interface MetricSnapshot {
  name: string;
  type: MetricType;
  help: string;
  values: MetricValue[];
  aggregated?: {
    sum: number;
    count: number;
    min: number;
    max: number;
    avg: number;
    percentiles?: Record<number, number>;
  };
}

/**
 * Metrics Service
 * Collects and manages application metrics for AI operations
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics: Map<string, MetricOptions> = new Map();
  private readonly values: Map<string, MetricValue[]> = new Map();
  private readonly exportInterval: number;
  private exportTimer?: NodeJS.Timeout;

  // Common AI metrics
  private readonly commonMetrics = {
    // Counters
    'ai_requests_total': {
      type: MetricType.COUNTER,
      help: 'Total number of AI requests',
      labels: ['operation', 'status'],
    },
    'ai_tokens_used_total': {
      type: MetricType.COUNTER,
      help: 'Total number of tokens used',
      labels: ['model', 'operation'],
    },
    'ai_errors_total': {
      type: MetricType.COUNTER,
      help: 'Total number of AI errors',
      labels: ['operation', 'error_type'],
    },
    'ai_cache_hits_total': {
      type: MetricType.COUNTER,
      help: 'Total number of cache hits',
      labels: ['cache_type'],
    },
    'ai_cache_misses_total': {
      type: MetricType.COUNTER,
      help: 'Total number of cache misses',
      labels: ['cache_type'],
    },

    // Gauges
    'ai_active_sessions': {
      type: MetricType.GAUGE,
      help: 'Number of active AI sessions',
    },
    'ai_queue_size': {
      type: MetricType.GAUGE,
      help: 'Current AI request queue size',
      labels: ['queue_name'],
    },
    'ai_rate_limit_remaining': {
      type: MetricType.GAUGE,
      help: 'Remaining rate limit for AI requests',
      labels: ['user_id'],
    },

    // Histograms
    'ai_request_duration_seconds': {
      type: MetricType.HISTOGRAM,
      help: 'AI request duration in seconds',
      labels: ['operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    },
    'ai_response_size_bytes': {
      type: MetricType.HISTOGRAM,
      help: 'AI response size in bytes',
      labels: ['operation'],
      buckets: [100, 500, 1000, 5000, 10000, 50000],
    },

    // Summaries
    'ai_cost_dollars': {
      type: MetricType.SUMMARY,
      help: 'AI operation cost in dollars',
      labels: ['operation', 'model'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.exportInterval = this.configService.get<number>('METRICS_EXPORT_INTERVAL', 60000); // 1 minute
    this.initializeCommonMetrics();
    this.startExportTimer();
  }

  /**
   * Initialize common metrics
   */
  private initializeCommonMetrics(): void {
    for (const [name, options] of Object.entries(this.commonMetrics)) {
      this.register({
        name,
        ...options,
      } as MetricOptions);
    }
  }

  /**
   * Register a new metric
   */
  register(options: MetricOptions): void {
    if (this.metrics.has(options.name)) {
      this.logger.warn(`Metric '${options.name}' already registered`);
      return;
    }

    this.metrics.set(options.name, options);
    this.values.set(options.name, []);

    this.logger.debug(`Registered metric: ${options.name} (${options.type})`);
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      this.logger.warn(`Metric '${name}' not found`);
      return;
    }

    if (metric.type !== MetricType.COUNTER) {
      this.logger.warn(`Metric '${name}' is not a counter`);
      return;
    }

    // For counters, accumulate values with the same labels
    const values = this.values.get(name)!;
    const labelKey = this.getLabelKey(labels);
    
    const existingIndex = values.findIndex(v => 
      this.getLabelKey(v.labels) === labelKey
    );

    if (existingIndex >= 0) {
      // Accumulate the value
      values[existingIndex].value += value;
      values[existingIndex].timestamp = new Date();
    } else {
      // Add new entry
      this.addValue(name, value, labels);
    }
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      this.logger.warn(`Metric '${name}' not found`);
      return;
    }

    if (metric.type !== MetricType.GAUGE) {
      this.logger.warn(`Metric '${name}' is not a gauge`);
      return;
    }

    // For gauges, replace existing value with same labels
    const values = this.values.get(name)!;
    const labelKey = this.getLabelKey(labels);
    
    const existingIndex = values.findIndex(v => 
      this.getLabelKey(v.labels) === labelKey
    );

    if (existingIndex >= 0) {
      values[existingIndex] = { value, labels, timestamp: new Date() };
    } else {
      this.addValue(name, value, labels);
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      this.logger.warn(`Metric '${name}' not found`);
      return;
    }

    if (metric.type !== MetricType.HISTOGRAM) {
      this.logger.warn(`Metric '${name}' is not a histogram`);
      return;
    }

    this.addValue(name, value, labels);
  }

  /**
   * Record a summary value
   */
  recordSummary(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      this.logger.warn(`Metric '${name}' not found`);
      return;
    }

    if (metric.type !== MetricType.SUMMARY) {
      this.logger.warn(`Metric '${name}' is not a summary`);
      return;
    }

    this.addValue(name, value, labels);
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.recordHistogram(name, duration, labels);
    };
  }

  /**
   * Add a value to a metric
   */
  private addValue(name: string, value: number, labels?: Record<string, string>): void {
    const values = this.values.get(name);
    
    if (!values) {
      return;
    }

    values.push({
      value,
      labels,
      timestamp: new Date(),
    });

    // Emit event for real-time monitoring
    this.eventEmitter.emit('metrics.update', {
      name,
      value,
      labels,
    });
  }

  /**
   * Get metric snapshot
   */
  getSnapshot(name: string): MetricSnapshot | null {
    const metric = this.metrics.get(name);
    const values = this.values.get(name);
    
    if (!metric || !values) {
      return null;
    }

    const snapshot: MetricSnapshot = {
      name,
      type: metric.type,
      help: metric.help,
      values: [...values],
    };

    // Calculate aggregates
    if (values.length > 0) {
      const numbers = values.map(v => v.value);
      snapshot.aggregated = {
        sum: numbers.reduce((a, b) => a + b, 0),
        count: numbers.length,
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      };

      // Calculate percentiles for summaries
      if (metric.type === MetricType.SUMMARY && metric.percentiles) {
        snapshot.aggregated.percentiles = this.calculatePercentiles(
          numbers,
          metric.percentiles,
        );
      }
    }

    return snapshot;
  }

  /**
   * Get all metrics snapshots
   */
  getAllSnapshots(): MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = [];
    
    for (const name of this.metrics.keys()) {
      const snapshot = this.getSnapshot(name);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }
    
    return snapshots;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    
    for (const [name, metric] of this.metrics.entries()) {
      const values = this.values.get(name)!;
      
      // Add metric help and type
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);
      
      // Group values by labels
      const grouped = this.groupValuesByLabels(values);
      
      for (const [labelKey, groupedValues] of grouped.entries()) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        
        if (metric.type === MetricType.COUNTER || metric.type === MetricType.GAUGE) {
          // Sum values for counters, use latest for gauges
          const value = metric.type === MetricType.COUNTER
            ? groupedValues.reduce((sum, v) => sum + v.value, 0)
            : groupedValues[groupedValues.length - 1]?.value || 0;
          
          lines.push(`${name}${labelStr} ${value}`);
        } else if (metric.type === MetricType.HISTOGRAM) {
          // Calculate histogram buckets
          const buckets = metric.buckets || [0.1, 0.5, 1, 2, 5, 10];
          const counts = this.calculateHistogramBuckets(
            groupedValues.map(v => v.value),
            buckets,
          );
          
          for (let i = 0; i < buckets.length; i++) {
            lines.push(`${name}_bucket{${labelKey ? labelKey + ',' : ''}le="${buckets[i]}"} ${counts[i]}`);
          }
          lines.push(`${name}_bucket{${labelKey ? labelKey + ',' : ''}le="+Inf"} ${groupedValues.length}`);
          lines.push(`${name}_sum${labelStr} ${groupedValues.reduce((sum, v) => sum + v.value, 0)}`);
          lines.push(`${name}_count${labelStr} ${groupedValues.length}`);
        } else if (metric.type === MetricType.SUMMARY) {
          // Calculate summary percentiles
          const percentiles = metric.percentiles || [0.5, 0.9, 0.95, 0.99];
          const values = groupedValues.map(v => v.value);
          const calculated = this.calculatePercentiles(values, percentiles);
          
          for (const [percentile, value] of Object.entries(calculated)) {
            lines.push(`${name}{${labelKey ? labelKey + ',' : ''}quantile="${percentile}"} ${value}`);
          }
          lines.push(`${name}_sum${labelStr} ${values.reduce((sum, v) => sum + v, 0)}`);
          lines.push(`${name}_count${labelStr} ${values.length}`);
        }
      }
      
      lines.push(''); // Empty line between metrics
    }
    
    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): any {
    const metrics: any = {};
    
    for (const [name, metric] of this.metrics.entries()) {
      const snapshot = this.getSnapshot(name);
      if (snapshot) {
        metrics[name] = {
          type: metric.type,
          help: metric.help,
          ...snapshot.aggregated,
          values: snapshot.values,
        };
      }
    }
    
    return metrics;
  }

  /**
   * Clear metrics values
   */
  clear(name?: string): void {
    if (name) {
      const values = this.values.get(name);
      if (values) {
        values.length = 0;
      }
    } else {
      for (const values of this.values.values()) {
        values.length = 0;
      }
    }
  }

  /**
   * Group values by labels
   */
  private groupValuesByLabels(values: MetricValue[]): Map<string, MetricValue[]> {
    const grouped = new Map<string, MetricValue[]>();
    
    for (const value of values) {
      const key = this.getLabelKey(value.labels);
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(value);
    }
    
    return grouped;
  }

  /**
   * Get all metrics
   */
  getMetrics(): {
    counters: MetricSnapshot[];
    gauges: MetricSnapshot[];
    histograms: MetricSnapshot[];
    summaries: MetricSnapshot[];
  } {
    const result = {
      counters: [] as MetricSnapshot[],
      gauges: [] as MetricSnapshot[],
      histograms: [] as MetricSnapshot[],
      summaries: [] as MetricSnapshot[],
    };

    for (const [name, metric] of this.metrics) {
      const snapshot = this.getSnapshot(name);
      if (snapshot) {
        switch (metric.type) {
          case MetricType.COUNTER:
            result.counters.push(snapshot);
            break;
          case MetricType.GAUGE:
            result.gauges.push(snapshot);
            break;
          case MetricType.HISTOGRAM:
            result.histograms.push(snapshot);
            break;
          case MetricType.SUMMARY:
            result.summaries.push(snapshot);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Get label key string
   */
  private getLabelKey(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${this.escapePrometheusLabel(v)}"`)
      .join(',');
  }

  /**
   * Escape label value for Prometheus format
   */
  private escapePrometheusLabel(value: string): string {
    return value
      .replace(/\\/g, '\\\\')  // バックスラッシュをエスケープ
      .replace(/"/g, '\\"')    // ダブルクォートをエスケープ
      .replace(/\n/g, '\\n');  // 改行をエスケープ
  }

  /**
   * Calculate histogram buckets
   */
  private calculateHistogramBuckets(values: number[], buckets: number[]): number[] {
    const counts = new Array(buckets.length).fill(0);
    
    for (const value of values) {
      for (let i = 0; i < buckets.length; i++) {
        if (value <= buckets[i]) {
          counts[i]++;
        }
      }
    }
    
    return counts;
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentiles(
    values: number[],
    percentiles: number[],
  ): Record<number, number> {
    if (values.length === 0) {
      return {};
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const result: Record<number, number> = {};
    
    for (const percentile of percentiles) {
      const index = Math.ceil(percentile * sorted.length) - 1;
      result[percentile] = sorted[Math.max(0, index)];
    }
    
    return result;
  }

  /**
   * Start periodic export timer
   */
  private startExportTimer(): void {
    this.exportTimer = setInterval(() => {
      this.export();
    }, this.exportInterval);
  }

  /**
   * Export metrics
   */
  private export(): void {
    try {
      const prometheus = this.exportPrometheus();
      const json = this.exportJSON();
      
      // Emit export event
      this.eventEmitter.emit('metrics.export', {
        prometheus,
        json,
        timestamp: new Date(),
      });
      
      this.logger.debug('Metrics exported');
    } catch (error) {
      this.logger.error('Failed to export metrics', error);
    }
  }

  /**
   * Clean up resources
   */
  onModuleDestroy(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }
    
    // Final export
    this.export();
  }
}