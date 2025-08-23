import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AIMonitoringService,
  AIMetrics,
  AIAlert,
  AIOperationType,
  AIOperationStatus,
} from './ai-monitoring.service';
import { MetricsService } from './metrics.service';

describe('AIMonitoringService', () => {
  let service: AIMonitoringService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMonitoringService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                AI_MONITORING_BUFFER_SIZE: 100,
                AI_MONITORING_FLUSH_INTERVAL: 60000,
                AI_COST_PER_1K_TOKENS_INPUT: 0.01,
                AI_COST_PER_1K_TOKENS_OUTPUT: 0.03,
                AI_ALERT_ERROR_RATE_THRESHOLD: 0.1,
                AI_ALERT_LATENCY_THRESHOLD: 5000,
                AI_ALERT_COST_THRESHOLD: 100,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementCounter: jest.fn(),
            recordGauge: jest.fn(),
            recordHistogram: jest.fn(),
            recordSummary: jest.fn(),
            getMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIMonitoringService>(AIMonitoringService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordMetric', () => {
    it('should record a metric successfully', async () => {
      const metric: AIMetrics = {
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1500,
        tokensUsed: 300,
        cost: 0.01,
        userId: 123,
      };

      await service.recordMetric(metric);

      const stats = service.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
    });

    it('should handle failed metrics', async () => {
      const metric: AIMetrics = {
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.FAILURE,
        duration: 2000,
        metadata: { error: 'API rate limit exceeded' },
      };

      await service.recordMetric(metric);

      const stats = service.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(1);
    });

    it('should calculate costs correctly', async () => {
      const metric: AIMetrics = {
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        tokensUsed: 3000,
        cost: 0.07,
      };

      await service.recordMetric(metric);

      const stats = service.getStats();
      expect(stats.totalCost).toBe(0.07);
    });

    it('should track token usage', async () => {
      const metric: AIMetrics = {
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        tokensUsed: 3000,
      };

      await service.recordMetric(metric);

      const stats = service.getStats();
      expect(stats.totalTokens).toBe(3000);
    });

    it('should track metrics by user', async () => {
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        userId: 1,
      });

      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.WEB_SEARCH,
        status: AIOperationStatus.SUCCESS,
        duration: 500,
        userId: 2,
      });

      const stats1 = service.getStats(1);
      const stats2 = service.getStats(2);
      expect(stats1.totalRequests).toBe(1);
      expect(stats2.totalRequests).toBe(1);
    });

    it('should track cache hit rate', async () => {
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.CACHE_HIT,
        status: AIOperationStatus.SUCCESS,
        duration: 10,
      });

      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.CACHE_MISS,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
      });

      const stats = service.getStats();
      expect(stats.cacheHitRate).toBe(50);
    });
  });

  describe('alerts', () => {
    it('should trigger alert for high error rate', async () => {
      // Record 10 metrics, 2 failures = 20% error rate > 10% threshold
      for (let i = 0; i < 8; i++) {
        await service.recordMetric({
          timestamp: new Date(),
          operationType: AIOperationType.GENERATE_RESPONSE,
          status: AIOperationStatus.SUCCESS,
          duration: 1000,
        });
      }

      for (let i = 0; i < 2; i++) {
        await service.recordMetric({
          timestamp: new Date(),
          operationType: AIOperationType.GENERATE_RESPONSE,
          status: AIOperationStatus.FAILURE,
          duration: 1000,
        });
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ai.alert',
        expect.objectContaining({
          severity: 'medium',
          type: 'error_rate',
        }),
      );
    });

    it('should trigger alert for high response time', async () => {
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 10000, // 10 seconds > 5 second threshold
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ai.alert',
        expect.objectContaining({
          severity: 'medium',
          type: 'response_time',
        }),
      );
    });

    it('should trigger alert for high cost', async () => {
      // Need to accumulate cost over threshold
      // First 10 metrics: total $100 (at threshold, no alert)
      for (let i = 0; i < 10; i++) {
        await service.recordMetric({
          timestamp: new Date(),
          operationType: AIOperationType.GENERATE_RESPONSE,
          status: AIOperationStatus.SUCCESS,
          duration: 1000,
          cost: 10,
        });
      }
      
      // 11th metric: total $110 (crosses threshold, triggers alert)
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        cost: 10,
      });

      // Alert should trigger when crossing threshold ($110 > $100)
      // Severity is 'high' because $110 < $200 (2x threshold)
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ai.alert',
        expect.objectContaining({
          severity: 'high',
          type: 'cost_threshold',
        }),
      );
      
      // Additional metrics shouldn't trigger more alerts
      for (let i = 0; i < 9; i++) {
        await service.recordMetric({
          timestamp: new Date(),
          operationType: AIOperationType.GENERATE_RESPONSE,
          status: AIOperationStatus.SUCCESS,
          duration: 1000,
          cost: 10,
        });
      }
      
      // Verify cost alert was triggered exactly once
      const costAlertCalls = (eventEmitter.emit as jest.Mock).mock.calls.filter(
        call => call[0] === 'ai.alert' && call[1]?.type === 'cost_threshold'
      );
      expect(costAlertCalls).toHaveLength(1);
    });

    it('should trigger rate limit alert', async () => {
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.RATE_LIMITED,
        duration: 100,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ai.alert',
        expect.objectContaining({
          severity: 'medium',
          type: 'rate_limit',
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = service.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });

    it('should calculate average response time correctly', async () => {
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
      });

      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 2000,
      });

      const stats = service.getStats();
      expect(stats.averageResponseTime).toBe(1500);
    });
  });

  describe('getMetrics', () => {
    it('should filter metrics by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await service.recordMetric({
        timestamp: twoHoursAgo,
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
      });

      await service.recordMetric({
        timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
      });

      const metrics = service.getMetrics(oneHourAgo, now);
      expect(metrics).toHaveLength(1);
    });

    it('should filter by user and operation type', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        userId: 1,
      });

      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.WEB_SEARCH,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        userId: 2,
      });

      const metrics = service.getMetrics(oneHourAgo, now, {
        userId: 1,
        operationType: AIOperationType.GENERATE_RESPONSE,
      });
      expect(metrics).toHaveLength(1);
    });
  });

  describe('logAIRequest', () => {
    it('should log AI request with metrics', () => {
      service.logAIRequest(123, 'chat.completion', 1000, 0.05);

      expect(metricsService.incrementCounter).toHaveBeenCalledWith(
        'ai_requests_total',
        { action: 'chat.completion' },
      );
      expect(metricsService.recordHistogram).toHaveBeenCalledWith(
        'ai_tokens_used',
        1000,
        { action: 'chat.completion' },
      );
      expect(metricsService.recordHistogram).toHaveBeenCalledWith(
        'ai_cost_usd',
        0.05,
        { action: 'chat.completion' },
      );
    });
  });

  describe('logAIError', () => {
    it('should log AI error with metrics', () => {
      const error = new Error('API rate limit exceeded');
      service.logAIError(456, 'web.search', error);

      expect(metricsService.incrementCounter).toHaveBeenCalledWith(
        'ai_errors_total',
        { action: 'web.search', error: 'Error' },
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for GPT-4 model', () => {
      const cost = service.calculateCost(1000, 'gpt-4');
      // (1000/1000) * ((0.03 + 0.06) / 2) = 1 * 0.045 = 0.045
      expect(cost).toBe(0.045);
    });

    it('should calculate cost for GPT-3.5-turbo model', () => {
      const cost = service.calculateCost(1000, 'gpt-3.5-turbo');
      // (1000/1000) * ((0.0005 + 0.0015) / 2) = 1 * 0.001 = 0.001
      expect(cost).toBe(0.001);
    });

    it('should default to GPT-4 rates for unknown models', () => {
      const cost = service.calculateCost(1000, 'unknown-model');
      expect(cost).toBe(0.045);
    });
  });

  describe('startOperation and endOperation', () => {
    it('should emit operation start and end events', async () => {
      const operationId = service.startOperation(
        AIOperationType.GENERATE_RESPONSE,
        { prompt: 'test' },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ai.operation.start',
        expect.objectContaining({
          operationId,
          operationType: AIOperationType.GENERATE_RESPONSE,
        }),
      );

      await service.endOperation(operationId, AIOperationStatus.SUCCESS, {
        tokensUsed: 100,
        cost: 0.01,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ai.operation.end',
        expect.objectContaining({
          operationId,
          status: AIOperationStatus.SUCCESS,
        }),
      );
    });
  });

  describe('buffer management', () => {
    it('should respect buffer size limit', async () => {
      // Set buffer size to 5 for testing
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AI_MONITORING_BUFFER_SIZE') return 5;
        return defaultValue;
      });

      const newService = new AIMonitoringService(configService, eventEmitter, metricsService);

      // Add 10 metrics
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        await newService.recordMetric({
          timestamp: new Date(),
          operationType: AIOperationType.GENERATE_RESPONSE,
          status: AIOperationStatus.SUCCESS,
          duration: 100,
        });
      }

      const metrics = newService.getMetrics(
        new Date(now.getTime() - 60000),
        new Date(now.getTime() + 60000),
      );
      expect(metrics.length).toBeLessThanOrEqual(5);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent metric recording', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          service.recordMetric({
            timestamp: new Date(),
            operationType: AIOperationType.GENERATE_RESPONSE,
            status: Math.random() > 0.1 ? AIOperationStatus.SUCCESS : AIOperationStatus.FAILURE,
            duration: Math.random() * 1000,
          }),
        );
      }

      await Promise.all(promises);

      const stats = service.getStats();
      expect(stats.totalRequests).toBe(100);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', async () => {
      await service.recordMetric({
        timestamp: new Date(),
        operationType: AIOperationType.GENERATE_RESPONSE,
        status: AIOperationStatus.SUCCESS,
        duration: 1000,
        tokensUsed: 500,
        cost: 0.05,
        userId: 1,
      });

      const report = service.generateReport(1);
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('operationBreakdown');
    });
  });
});