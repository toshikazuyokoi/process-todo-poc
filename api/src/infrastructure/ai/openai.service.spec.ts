import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import OpenAI from 'openai';

jest.mock('openai');

describe('OpenAIService', () => {
  let service: OpenAIService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                OPENAI_API_KEY: 'test-api-key',
                OPENAI_MODEL: 'gpt-4-turbo-preview',
                OPENAI_MAX_TOKENS: 2000,
                OPENAI_TEMPERATURE: 0.7,
                OPENAI_RATE_LIMIT_PER_USER: 100,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock OpenAI instance
    mockOpenAI = (service as any).openai;
  });

  describe('constructor', () => {
    it('should initialize with null openai client if API key is not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce(undefined);
      
      const service = new OpenAIService(configService);
      expect((service as any).openai).toBeNull();
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockCompletion = {
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: { total_tokens: 100 },
        model: 'gpt-4',
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockCompletion),
        },
      } as any;

      const result = await service.generateResponse('Test prompt', {
        sessionId: 'test-session',
        userId: 1,
      });

      expect(result).toEqual({
        content: 'Test response',
        confidence: 0.9,
        metadata: {
          model: 'gpt-4',
          tokensUsed: 100,
          finishReason: 'stop',
        },
      });
    });

    it('should handle API errors', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      } as any;

      await expect(
        service.generateResponse('Test prompt', {
          sessionId: 'test-session',
          userId: 1,
        }),
      ).rejects.toThrow('Failed to generate AI response');
    });
  });

  describe('generateTemplate', () => {
    it('should generate template successfully', async () => {
      const mockTemplate = {
        name: 'Test Template',
        description: 'Test Description',
        steps: [
          {
            name: 'Step 1',
            description: 'Step 1 description',
            duration: 5,
            dependencies: [],
          },
        ],
        confidence: 0.85,
        reasoning: 'Generated based on requirements',
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { content: JSON.stringify(mockTemplate) },
              },
            ],
            usage: { total_tokens: 200 },
            model: 'gpt-4',
          }),
        },
      } as any;

      const result = await service.generateTemplate(
        [{ requirement: 'test' }],
        {
          industry: 'Technology',
          processType: 'Development',
          complexity: 'medium',
        },
      );

      expect(result.name).toBe('Test Template');
      expect(result.steps).toHaveLength(1);
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from text', async () => {
      const mockEntities = {
        entities: [
          {
            type: 'requirement',
            value: 'User authentication',
            confidence: 0.9,
          },
        ],
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { content: JSON.stringify(mockEntities) },
              },
            ],
          }),
        },
      } as any;

      const result = await service.extractEntities(
        'We need user authentication',
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('requirement');
      expect(result[0].value).toBe('User authentication');
    });

    it('should return empty array on error', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      } as any;

      const result = await service.extractEntities('Test text');
      expect(result).toEqual([]);
    });
  });

  describe('classifyIntent', () => {
    it('should classify intent correctly', async () => {
      const mockIntent = {
        type: 'create_template',
        confidence: 0.95,
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { content: JSON.stringify(mockIntent) },
              },
            ],
          }),
        },
      } as any;

      const result = await service.classifyIntent(
        'I want to create a new template',
      );

      expect(result.type).toBe('create_template');
      expect(result.confidence).toBe(0.95);
    });

    it('should return other type on error', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      } as any;

      const result = await service.classifyIntent('Test message');
      expect(result).toEqual({ type: 'other', confidence: 0 });
    });
  });

  describe('summarizeText', () => {
    it('should summarize text successfully', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { content: 'Summary of the text' },
              },
            ],
          }),
        },
      } as any;

      const result = await service.summarizeText('Long text...', 100);
      expect(result).toBe('Summary of the text');
    });
  });

  describe('validateResponse', () => {
    it('should validate response as appropriate', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { content: '{"valid": true}' },
              },
            ],
          }),
        },
      } as any;

      const result = await service.validateResponse('Valid response');
      expect(result).toBe(true);
    });

    it('should return false for invalid response', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { content: '{"valid": false}' },
              },
            ],
          }),
        },
      } as any;

      const result = await service.validateResponse('Invalid response');
      expect(result).toBe(false);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      const text = 'This is a test message';
      const tokens = service.estimateTokens(text);
      
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = await service.checkRateLimit(1);
      expect(result).toBe(true);
    });

    it('should block requests exceeding rate limit', async () => {
      // Simulate hitting rate limit
      for (let i = 0; i < 100; i++) {
        await service.checkRateLimit(2);
      }

      const result = await service.checkRateLimit(2);
      expect(result).toBe(false);
    });

    it('should reset rate limit after time window', async () => {
      // Set initial rate limit
      await service.checkRateLimit(3);
      
      // Manually set expired time
      const rateLimitMap = (service as any).rateLimitMap;
      const userLimit = rateLimitMap.get(3);
      if (userLimit) {
        userLimit.resetTime = new Date(Date.now() - 1000);
      }

      const result = await service.checkRateLimit(3);
      expect(result).toBe(true);
    });
  });
});