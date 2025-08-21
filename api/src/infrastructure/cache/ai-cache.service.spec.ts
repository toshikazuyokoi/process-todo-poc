import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AICacheService } from './ai-cache.service';
import { CacheKeyGenerator } from './cache-key.generator';

const CACHE_MANAGER = 'CACHE_MANAGER';

describe('AICacheService', () => {
  let service: AICacheService;
  let cacheManager: any;
  let keyGenerator: CacheKeyGenerator;
  let configService: ConfigService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
    store: {
      keys: jest.fn(),
    },
  };

  const mockKeyGenerator = {
    generateResponseKey: jest.fn(),
    generateTemplateKey: jest.fn(),
    generateSearchKey: jest.fn(),
    generateSessionKey: jest.fn(),
    generateUserKey: jest.fn(),
    matchesPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AICacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheKeyGenerator,
          useValue: mockKeyGenerator,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                AI_CACHE_TTL: 3600,
                AI_CACHE_MAX_SIZE: 1000,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AICacheService>(AICacheService);
    cacheManager = module.get(CACHE_MANAGER);
    keyGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get value from cache and record hit', async () => {
      const testValue = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(testValue);

      const result = await service.get('test-key');

      expect(result).toEqual(testValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-key');
      
      const stats = service.getStatistics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should record miss when value not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
      
      const stats = service.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with default TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        3600000, // TTL in milliseconds
      );
      
      const stats = service.getStatistics();
      expect(stats.sets).toBe(1);
    });

    it('should set value with custom TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' }, { ttl: 1800 });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        1800000,
      );
    });

    it('should store tags when provided', async () => {
      // Mock for tag retrieval (both tags don't exist initially)
      mockCacheManager.get
        .mockResolvedValueOnce(null) // tag:tag1 doesn't exist
        .mockResolvedValueOnce(null); // tag:tag2 doesn't exist
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' }, { tags: ['tag1', 'tag2'] });

      // Should store tags
      expect(mockCacheManager.set).toHaveBeenCalledTimes(3); // 1 for value, 2 for tags
      expect(mockCacheManager.set).toHaveBeenNthCalledWith(1, 'test-key', { data: 'test' }, 3600000);
      expect(mockCacheManager.set).toHaveBeenNthCalledWith(2, 'tag:tag1', ['test-key'], 3600000);
      expect(mockCacheManager.set).toHaveBeenNthCalledWith(3, 'tag:tag2', ['test-key'], 3600000);
    });

    it('should handle set errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(
        service.set('test-key', { data: 'test' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete value from cache', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.delete('test-key');

      expect(mockCacheManager.del).toHaveBeenCalledWith('test-key');
      
      const stats = service.getStatistics();
      expect(stats.deletes).toBe(1);
    });

    it('should handle delete errors gracefully', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.delete('test-key')).resolves.toBeUndefined();
    });
  });

  describe('deleteByPattern', () => {
    it('should delete all keys matching pattern', async () => {
      const allKeys = ['ai:response:1', 'ai:response:2', 'ai:template:1'];
      mockCacheManager.store.keys.mockResolvedValue(allKeys);
      mockKeyGenerator.matchesPattern.mockImplementation((key, pattern) => 
        key.startsWith('ai:response:'),
      );
      mockCacheManager.del.mockResolvedValue(undefined);

      const count = await service.deleteByPattern('ai:response:*');

      expect(count).toBe(2);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should return 0 on error', async () => {
      mockCacheManager.store.keys.mockRejectedValue(new Error('Cache error'));

      const count = await service.deleteByPattern('test-pattern');

      expect(count).toBe(0);
    });
  });

  describe('deleteByTag', () => {
    it('should delete all keys with specific tag', async () => {
      const taggedKeys = ['key1', 'key2', 'key3'];
      mockCacheManager.get.mockResolvedValue(taggedKeys);
      mockCacheManager.del.mockResolvedValue(undefined);

      const count = await service.deleteByTag('test-tag');

      expect(count).toBe(3);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4); // 3 keys + 1 tag key
    });

    it('should return 0 when no keys found', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const count = await service.deleteByTag('test-tag');

      expect(count).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const count = await service.deleteByTag('test-tag');

      expect(count).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache and reset statistics', async () => {
      // Set some initial statistics
      mockCacheManager.get.mockResolvedValue('value');
      await service.get('test-key'); // Increment hit counter
      
      mockCacheManager.reset.mockResolvedValue(undefined);

      await service.clear();

      expect(mockCacheManager.reset).toHaveBeenCalled();
      
      const stats = service.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
    });

    it('should handle clear errors gracefully', async () => {
      mockCacheManager.reset.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.clear()).resolves.toBeUndefined();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { data: 'cached' };
      mockCacheManager.get.mockResolvedValue(cachedValue);

      const factory = jest.fn();
      const result = await service.getOrSet('test-key', factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const newValue = { data: 'new' };
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue(newValue);
      const result = await service.getOrSet('test-key', factory, { ttl: 1800 });

      expect(result).toEqual(newValue);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        newValue,
        1800000,
      );
    });
  });

  describe('cacheAIResponse', () => {
    it('should cache AI response with proper key', async () => {
      mockKeyGenerator.generateResponseKey.mockReturnValue('ai:response:hash');
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue([]);

      const response = { content: 'AI response' };
      await service.cacheAIResponse(
        'test prompt',
        { context: 'test' },
        response,
        1800,
      );

      expect(mockKeyGenerator.generateResponseKey).toHaveBeenCalledWith(
        'test prompt',
        { context: 'test' },
      );
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('getCachedAIResponse', () => {
    it('should get cached AI response', async () => {
      const cachedResponse = { content: 'Cached AI response' };
      mockKeyGenerator.generateResponseKey.mockReturnValue('ai:response:hash');
      mockCacheManager.get.mockResolvedValue(cachedResponse);

      const result = await service.getCachedAIResponse(
        'test prompt',
        { context: 'test' },
      );

      expect(result).toEqual(cachedResponse);
      expect(mockKeyGenerator.generateResponseKey).toHaveBeenCalledWith(
        'test prompt',
        { context: 'test' },
      );
    });
  });

  describe('cacheTemplate', () => {
    it('should cache template with proper key', async () => {
      mockKeyGenerator.generateTemplateKey.mockReturnValue('ai:template:hash');
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue([]);

      const template = { name: 'Test Template' };
      await service.cacheTemplate(
        [{ requirement: 'test' }],
        { context: 'test' },
        template,
        3600,
      );

      expect(mockKeyGenerator.generateTemplateKey).toHaveBeenCalledWith(
        [{ requirement: 'test' }],
        { context: 'test' },
      );
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('getCachedTemplate', () => {
    it('should get cached template', async () => {
      const cachedTemplate = { name: 'Cached Template' };
      mockKeyGenerator.generateTemplateKey.mockReturnValue('ai:template:hash');
      mockCacheManager.get.mockResolvedValue(cachedTemplate);

      const result = await service.getCachedTemplate(
        [{ requirement: 'test' }],
        { context: 'test' },
      );

      expect(result).toEqual(cachedTemplate);
    });
  });

  describe('cacheSearchResults', () => {
    it('should cache search results with proper key', async () => {
      mockKeyGenerator.generateSearchKey.mockReturnValue('ai:search:hash');
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue([]);

      const results = [{ title: 'Result 1' }];
      await service.cacheSearchResults(
        'search query',
        { param: 'value' },
        results,
        1800,
      );

      expect(mockKeyGenerator.generateSearchKey).toHaveBeenCalledWith(
        'search query',
        { param: 'value' },
      );
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('getCachedSearchResults', () => {
    it('should get cached search results', async () => {
      const cachedResults = [{ title: 'Cached Result' }];
      mockKeyGenerator.generateSearchKey.mockReturnValue('ai:search:hash');
      mockCacheManager.get.mockResolvedValue(cachedResults);

      const result = await service.getCachedSearchResults(
        'search query',
        { param: 'value' },
      );

      expect(result).toEqual(cachedResults);
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate all session cache', async () => {
      mockKeyGenerator.generateSessionKey.mockReturnValue('ai:session:123:*');
      const allKeys = ['ai:session:123:data', 'ai:session:123:status'];
      mockCacheManager.store.keys.mockResolvedValue(allKeys);
      mockKeyGenerator.matchesPattern.mockReturnValue(true);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidateSession('123');

      expect(mockKeyGenerator.generateSessionKey).toHaveBeenCalledWith('123', '*');
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateUser', () => {
    it('should invalidate all user cache', async () => {
      mockKeyGenerator.generateUserKey.mockReturnValue('ai:user:1:*');
      const allKeys = ['ai:user:1:profile', 'ai:user:1:settings'];
      mockCacheManager.store.keys.mockResolvedValue(allKeys);
      mockKeyGenerator.matchesPattern.mockReturnValue(true);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidateUser(1);

      expect(mockKeyGenerator.generateUserKey).toHaveBeenCalledWith(1, '*');
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatistics', () => {
    it('should return cache statistics', async () => {
      // Perform some operations to update statistics
      mockCacheManager.get.mockResolvedValueOnce('value'); // hit
      await service.get('key1');
      
      mockCacheManager.get.mockResolvedValueOnce(null); // miss
      await service.get('key2');
      
      mockCacheManager.set.mockResolvedValue(undefined);
      await service.set('key3', 'value');
      
      mockCacheManager.del.mockResolvedValue(undefined);
      await service.delete('key4');

      const stats = service.getStatistics();

      expect(stats).toEqual({
        hits: 1,
        misses: 1,
        sets: 1,
        deletes: 1,
        hitRate: 50,
      });
    });

    it('should handle zero total requests', () => {
      const stats = service.getStatistics();

      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
      });
    });
  });

  describe('warmUp', () => {
    it('should complete warm-up without errors', async () => {
      await expect(service.warmUp()).resolves.toBeUndefined();
    });

    it('should handle warm-up errors gracefully', async () => {
      // Mock an error scenario
      jest.spyOn(service as any, 'warmUp').mockRejectedValue(
        new Error('Warm-up failed'),
      );

      // Should not throw
      await expect(service.warmUp()).rejects.toThrow('Warm-up failed');
    });
  });

  describe('private methods', () => {
    describe('storeTags', () => {
      it('should store new tags', async () => {
        mockCacheManager.get.mockResolvedValue(null);
        mockCacheManager.set.mockResolvedValue(undefined);

        await (service as any).storeTags('test-key', ['tag1', 'tag2']);

        expect(mockCacheManager.set).toHaveBeenCalledTimes(2);
        expect(mockCacheManager.set).toHaveBeenCalledWith(
          'tag:tag1',
          ['test-key'],
          3600000,
        );
        expect(mockCacheManager.set).toHaveBeenCalledWith(
          'tag:tag2',
          ['test-key'],
          3600000,
        );
      });

      it('should append to existing tags', async () => {
        mockCacheManager.get.mockResolvedValue(['existing-key']);
        mockCacheManager.set.mockResolvedValue(undefined);

        await (service as any).storeTags('test-key', ['tag1']);

        expect(mockCacheManager.set).toHaveBeenCalledWith(
          'tag:tag1',
          ['existing-key', 'test-key'],
          3600000,
        );
      });

      it('should not duplicate keys in tags', async () => {
        mockCacheManager.get.mockResolvedValue(['test-key']);
        mockCacheManager.set.mockResolvedValue(undefined);

        await (service as any).storeTags('test-key', ['tag1']);

        expect(mockCacheManager.set).not.toHaveBeenCalled();
      });
    });

    describe('updateHitRate', () => {
      it('should calculate hit rate correctly', () => {
        (service as any).statistics.hits = 75;
        (service as any).statistics.misses = 25;

        (service as any).updateHitRate();

        expect((service as any).statistics.hitRate).toBe(75);
      });

      it('should handle zero total', () => {
        (service as any).statistics.hits = 0;
        (service as any).statistics.misses = 0;

        (service as any).updateHitRate();

        expect((service as any).statistics.hitRate).toBe(0);
      });
    });
  });
});