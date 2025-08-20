import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIConfigService } from './ai-config.service';

describe('AIConfigService', () => {
  let service: AIConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'OPENAI_API_KEY': 'test-api-key',
                'OPENAI_MODEL': 'gpt-4',
                'OPENAI_TEMPERATURE': 0.7,
                'OPENAI_MAX_TOKENS': 2000,
                'OPENAI_TIMEOUT_MS': 30000,
                'AI_RATE_LIMIT_REQUESTS_PER_MINUTE': 20,
                'AI_RATE_LIMIT_TOKENS_PER_MINUTE': 40000,
                'AI_MAX_CONCURRENT_SESSIONS': 10,
                'AI_CACHE_TTL_SECONDS': 86400,
                'AI_SESSION_TIMEOUT_MINUTES': 60,
                'AI_SESSION_MAX_DURATION_MINUTES': 180,
                'BULL_REDIS_HOST': 'localhost',
                'BULL_REDIS_PORT': 6379,
                'BULL_JOB_DEFAULT_RETRIES': 3,
                'BULL_JOB_DEFAULT_BACKOFF_DELAY': 5000,
                'BULL_JOB_REMOVE_ON_COMPLETE': 100,
                'BULL_JOB_REMOVE_ON_FAIL': 50,
                'AI_ENABLE_USAGE_TRACKING': true,
                'AI_LOG_LEVEL': 'info',
                'AI_ENABLE_DEBUG_MODE': false,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIConfigService>(AIConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('OpenAI Configuration', () => {
    it('should return OpenAI API key', () => {
      expect(service.openAIApiKey).toBe('test-api-key');
    });

    it('should return OpenAI model', () => {
      expect(service.openAIModel).toBe('gpt-4');
    });

    it('should return OpenAI temperature', () => {
      expect(service.openAITemperature).toBe(0.7);
    });

    it('should return OpenAI max tokens', () => {
      expect(service.openAIMaxTokens).toBe(2000);
    });

    it('should return OpenAI timeout', () => {
      expect(service.openAITimeoutMs).toBe(30000);
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should return rate limit requests per minute', () => {
      expect(service.rateLimitRequestsPerMinute).toBe(20);
    });

    it('should return rate limit tokens per minute', () => {
      expect(service.rateLimitTokensPerMinute).toBe(40000);
    });

    it('should return max concurrent sessions', () => {
      expect(service.maxConcurrentSessions).toBe(10);
    });
  });

  describe('Cache Configuration', () => {
    it('should return cache TTL seconds', () => {
      expect(service.cacheTTLSeconds).toBe(86400);
    });

    it('should return session timeout minutes', () => {
      expect(service.sessionTimeoutMinutes).toBe(60);
    });

    it('should return session max duration minutes', () => {
      expect(service.sessionMaxDurationMinutes).toBe(180);
    });
  });

  describe('Background Job Configuration', () => {
    it('should return Redis configuration', () => {
      expect(service.getRedisConfig()).toEqual({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should return job options', () => {
      const jobOptions = service.getJobOptions();
      expect(jobOptions.attempts).toBe(3);
      expect(jobOptions.backoff.type).toBe('exponential');
      expect(jobOptions.backoff.delay).toBe(5000);
      expect(jobOptions.removeOnComplete).toBe(100);
      expect(jobOptions.removeOnFail).toBe(50);
    });
  });

  describe('Validation', () => {
    it('should validate configuration successfully with valid config', () => {
      const validation = service.validateConfiguration();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation when OpenAI API key is missing', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return '';
        return null;
      });

      const validation = service.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('OPENAI_API_KEY is required');
    });

    it('should fail validation when temperature is out of range', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-key';
        if (key === 'OPENAI_TEMPERATURE') return 3;
        return null;
      });

      const validation = service.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('OPENAI_TEMPERATURE must be between 0 and 2');
    });
  });

  describe('Helper Methods', () => {
    it('should return OpenAI config object', () => {
      const config = service.getOpenAIConfig();
      expect(config).toEqual({
        apiKey: 'test-api-key',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30000,
      });
    });

    it('should return rate limits object', () => {
      const rateLimits = service.getRateLimits();
      expect(rateLimits).toEqual({
        requestsPerMinute: 20,
        tokensPerMinute: 40000,
        maxConcurrentSessions: 10,
      });
    });
  });
});