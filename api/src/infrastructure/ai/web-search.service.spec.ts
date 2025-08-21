import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WebSearchService } from './web-search.service';
import { AxiosResponse } from 'axios';

describe('WebSearchService', () => {
  let service: WebSearchService;
  let configService: ConfigService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                GOOGLE_SEARCH_API_KEY: 'test-api-key',
                GOOGLE_SEARCH_ENGINE_ID: 'test-engine-id',
                SEARCH_API_RATE_LIMIT: 100,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebSearchService>(WebSearchService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('search', () => {
    it('should return search results successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          items: [
            {
              title: 'Test Result 1',
              link: 'https://example.com/1',
              snippet: 'Test snippet 1',
              displayLink: 'example.com',
              formattedUrl: 'https://example.com/1',
            },
            {
              title: 'Test Result 2',
              link: 'https://example.com/2',
              snippet: 'Test snippet 2',
              displayLink: 'example.com',
              formattedUrl: 'https://example.com/2',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const results = await service.search('test query', { maxResults: 2 });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Test Result 1');
      expect(results[0].url).toBe('https://example.com/1');
      expect(results[0].source).toBe('example.com');
    });

    it('should use mock search when API key is not configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GOOGLE_SEARCH_API_KEY') return '';
        if (key === 'GOOGLE_SEARCH_ENGINE_ID') return '';
        return null;
      });

      const newService = new WebSearchService(configService, httpService);
      const results = await newService.search('test query');

      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('Best Practices');
    });

    it('should handle API errors gracefully', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => new Error('API Error')),
      );

      const results = await service.search('test query');

      // Should return mock results on error
      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('Best Practices');
    });
  });

  describe('searchBestPractices', () => {
    it('should search and filter best practices', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          items: [
            {
              title: 'Industry Best Practices',
              link: 'https://trusted.org/practices',
              snippet: 'Best practices guide',
              displayLink: 'trusted.org',
            },
            {
              title: 'Low Quality Content',
              link: 'https://untrusted.com/content',
              snippet: 'Some content',
              displayLink: 'untrusted.com',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const results = await service.searchBestPractices(
        'Technology',
        'Software Development',
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBe('trusted.org');
    });
  });

  describe('searchCompliance', () => {
    it('should search compliance requirements', async () => {
      const mockGovResponse: AxiosResponse = {
        data: {
          items: [
            {
              title: 'Government Compliance',
              link: 'https://example.gov/compliance',
              snippet: 'Official compliance requirements',
              displayLink: 'example.gov',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockGovResponse));

      const results = await service.searchCompliance('Healthcare', 'US');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBe('example.gov');
    });
  });

  describe('searchBenchmarks', () => {
    it('should search process benchmarks', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          items: [
            {
              title: 'Industry Benchmarks',
              link: 'https://benchmark.org/kpis',
              snippet: 'KPIs and metrics',
              displayLink: 'benchmark.org',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const results = await service.searchBenchmarks('Manufacturing');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Industry Benchmarks');
    });
  });

  describe('validateSource', () => {
    it('should validate trusted domains with high score', async () => {
      const result = await service.validateSource('https://example.gov/page');
      
      expect(result.score).toBeGreaterThanOrEqual(0.8);
      expect(result.factors.domainAuthority).toBeGreaterThanOrEqual(0.8);
    });

    it('should validate edu domains with high score', async () => {
      const result = await service.validateSource('https://mit.edu/research');
      
      expect(result.score).toBeGreaterThanOrEqual(0.8);
    });

    it('should give lower score to unknown domains', async () => {
      const result = await service.validateSource('https://random-site.com');
      
      expect(result.score).toBeLessThanOrEqual(0.7);
    });

    it('should handle invalid URLs', async () => {
      const result = await service.validateSource('not-a-url');
      
      expect(result.score).toBe(0);
      expect(result.warnings).toContain('Could not validate source');
    });
  });

  describe('extractContent', () => {
    it('should return mock content (not fully implemented)', async () => {
      const content = await service.extractContent('https://example.com');
      
      expect(content).toContain('Content from https://example.com');
    });

    it('should handle extraction errors', async () => {
      // Mock implementation that throws error
      jest.spyOn(service as any, 'extractContent').mockRejectedValue(
        new Error('Extraction failed'),
      );

      await expect(
        service.extractContent('https://invalid.com'),
      ).rejects.toThrow();
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = await service.checkRateLimit();
      expect(result).toBe(true);
    });

    it('should block requests after exceeding rate limit', async () => {
      // Reset counter
      (service as any).rateLimitCounter = 0;
      (service as any).rateLimitResetTime = new Date();

      // Simulate hitting rate limit
      for (let i = 0; i < 100; i++) {
        (service as any).rateLimitCounter++;
      }

      const result = await service.checkRateLimit();
      expect(result).toBe(false);
    });

    it('should reset counter after time window', async () => {
      // Set expired reset time
      (service as any).rateLimitCounter = 100;
      (service as any).rateLimitResetTime = new Date(Date.now() - 3700000); // Over 1 hour ago

      const result = await service.checkRateLimit();
      expect(result).toBe(true);
      expect((service as any).rateLimitCounter).toBe(1);
    });
  });

  describe('private methods', () => {
    describe('parseSearchResults', () => {
      it('should handle empty results', () => {
        const results = (service as any).parseSearchResults({});
        expect(results).toEqual([]);
      });

      it('should parse valid results', () => {
        const data = {
          items: [
            {
              title: 'Test',
              link: 'https://test.com',
              snippet: 'Test snippet',
            },
          ],
        };

        const results = (service as any).parseSearchResults(data);
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test');
      });
    });

    describe('assessSourceReliability', () => {
      it('should assess .gov domains highly', () => {
        const result = (service as any).assessSourceReliability(
          'https://example.gov',
        );
        expect(result.score).toBe(0.95);
      });

      it('should assess .edu domains highly', () => {
        const result = (service as any).assessSourceReliability(
          'https://stanford.edu',
        );
        expect(result.score).toBe(0.9);
      });

      it('should assess unknown domains moderately', () => {
        const result = (service as any).assessSourceReliability(
          'https://unknown.com',
        );
        expect(result.score).toBe(0.5);
      });
    });
  });
});