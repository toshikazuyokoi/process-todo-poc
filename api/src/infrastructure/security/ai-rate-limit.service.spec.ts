import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIRateLimitService } from './ai-rate-limit.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('AIRateLimitService', () => {
  let service: AIRateLimitService;
  let configService: ConfigService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const mockPipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 5],
        [null, 1],
      ]),
    };
    
    mockRedis = {
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      zrange: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
      zcard: jest.fn().mockResolvedValue(0),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIRateLimitService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                AI_RATE_LIMIT_MAX_REQUESTS: 100,
                AI_RATE_LIMIT_WINDOW_MS: 60000,
                AI_RATE_LIMIT_USE_REDIS: true,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AIRateLimitService>(AIRateLimitService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('checkLimit', () => {
    it('should allow request when under limit', async () => {
      const mockPipeline = mockRedis.pipeline();
      (mockPipeline.exec as jest.Mock).mockResolvedValueOnce([
        [null, 0],
        [null, 1],
        [null, 50], // 50 requests in window
        [null, 1],
      ]);

      const result = await service.checkLimit({
        identifier: 'user-123',
        maxRequests: 100,
        windowMs: 60000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should deny request when over limit', async () => {
      const mockPipeline = mockRedis.pipeline();
      (mockPipeline.exec as jest.Mock).mockResolvedValueOnce([
        [null, 0],
        [null, 1],
        [null, 101], // 101 requests in window (over limit of 100)
        [null, 1],
      ]);

      mockRedis.zrange.mockResolvedValueOnce(['1234567890', '1234567890']);

      const result = await service.checkLimit({
        identifier: 'user-123',
        maxRequests: 100,
        windowMs: 60000,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should use default values when not provided', async () => {
      const result = await service.checkLimit({
        identifier: 'user-123',
      });

      expect(result).toBeDefined();
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should fall back to in-memory when Redis fails', async () => {
      const mockPipeline = mockRedis.pipeline();
      (mockPipeline.exec as jest.Mock).mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.checkLimit({
        identifier: 'user-123',
        maxRequests: 10,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should use in-memory store when Redis is disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AI_RATE_LIMIT_USE_REDIS') return false;
        return defaultValue;
      });

      const result = await service.checkLimit({
        identifier: 'user-123',
        maxRequests: 5,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('resetLimit', () => {
    it('should reset limit for identifier', async () => {
      await service.resetLimit('user-123');

      expect(mockRedis.del).toHaveBeenCalledWith('ai-rate-limit:user-123');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis error'));

      await expect(service.resetLimit('user-123')).resolves.not.toThrow();
    });
  });

  describe('getUsage', () => {
    it('should return current usage from Redis', async () => {
      mockRedis.zcard.mockResolvedValueOnce(25);

      const usage = await service.getUsage('user-123');

      expect(usage.used).toBe(25);
      expect(usage.limit).toBe(100);
      expect(usage.resetAt).toBeInstanceOf(Date);
    });

    it('should return usage from in-memory store', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AI_RATE_LIMIT_USE_REDIS') return false;
        if (key === 'AI_RATE_LIMIT_MAX_REQUESTS') return 100;
        if (key === 'AI_RATE_LIMIT_WINDOW_MS') return 60000;
        return defaultValue;
      });

      const usage = await service.getUsage('user-123');

      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(100);
    });

    it('should handle errors and return defaults', async () => {
      mockRedis.zcard.mockRejectedValueOnce(new Error('Redis error'));

      const usage = await service.getUsage('user-123');

      expect(usage.used).toBe(0);
      expect(usage.limit).toBe(100);
      expect(usage.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('cleanupInMemoryStore', () => {
    it('should clean up expired records', async () => {
      // Set up in-memory store with expired records
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AI_RATE_LIMIT_USE_REDIS') return false;
        return defaultValue;
      });

      // Add a record
      await service.checkLimit({
        identifier: 'user-expired',
        maxRequests: 1,
        windowMs: 1, // 1ms window (will expire immediately)
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clean up
      service.cleanupInMemoryStore();

      // Check that expired record is removed
      const usage = await service.getUsage('user-expired');
      expect(usage.used).toBe(0);
    });
  });

  describe('in-memory rate limiting', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'AI_RATE_LIMIT_USE_REDIS') return false;
        if (key === 'AI_RATE_LIMIT_MAX_REQUESTS') return 3;
        if (key === 'AI_RATE_LIMIT_WINDOW_MS') return 1000;
        return defaultValue;
      });
    });

    it('should track multiple requests correctly', async () => {
      const identifier = 'test-user';
      
      // First request
      let result = await service.checkLimit({ identifier });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);

      // Second request
      result = await service.checkLimit({ identifier });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);

      // Third request
      result = await service.checkLimit({ identifier });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);

      // Fourth request (should be denied)
      result = await service.checkLimit({ identifier });
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset after window expires', async () => {
      const identifier = 'test-user-2';
      
      // Max out the limit
      for (let i = 0; i < 3; i++) {
        await service.checkLimit({ identifier, windowMs: 100 });
      }

      // Should be denied
      let result = await service.checkLimit({ identifier, windowMs: 100 });
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = await service.checkLimit({ identifier, windowMs: 100 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });
});