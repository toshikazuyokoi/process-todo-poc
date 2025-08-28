import { Test, TestingModule } from '@nestjs/testing';
import { SearchBestPracticesUseCase } from '../search-best-practices.usecase';
import { ProcessKnowledgeRepository } from '../../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { WebResearchCacheRepository } from '../../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
import { KnowledgeBaseService } from '../../../../domain/ai-agent/services/knowledge-base.service';
import { WebResearchService } from '../../../../domain/ai-agent/services/web-research.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { ComplexityLevel } from '../../../../domain/ai-agent/entities/process-analysis.entity';

describe('SearchBestPracticesUseCase', () => {
  let useCase: SearchBestPracticesUseCase;
  let knowledgeRepository: jest.Mocked<ProcessKnowledgeRepository>;
  let cacheRepository: jest.Mocked<WebResearchCacheRepository>;
  let knowledgeService: jest.Mocked<KnowledgeBaseService>;
  let researchService: jest.Mocked<WebResearchService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchBestPracticesUseCase,
        {
          provide: 'ProcessKnowledgeRepository',
          useValue: {
            search: jest.fn(),
            findBestPractices: jest.fn(),
          },
        },
        {
          provide: 'WebResearchCacheRepository',
          useValue: {
            findByQuery: jest.fn(),
            storeBatch: jest.fn(),
          },
        },
        {
          provide: KnowledgeBaseService,
          useValue: {
            getRelatedTemplates: jest.fn(),
          },
        },
        {
          provide: WebResearchService,
          useValue: {
            performResearch: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<SearchBestPracticesUseCase>(SearchBestPracticesUseCase);
    knowledgeRepository = module.get('ProcessKnowledgeRepository');
    cacheRepository = module.get('WebResearchCacheRepository');
    knowledgeService = module.get(KnowledgeBaseService);
    researchService = module.get(WebResearchService);
  });

  describe('execute', () => {
    const validInput = {
      userId: 1,
      query: 'agile development best practices',
      filters: {
        industry: 'software',
        processType: 'development',
        complexity: ComplexityLevel.MEDIUM,
        tags: ['agile', 'scrum'],
      },
      limit: 10,
    };

    const mockKnowledgeTemplates = [
      {
        id: 'template-1',
        name: 'Agile Sprint Process',
        description: 'Standard agile sprint process with ceremonies',
        industry: 'software',
        processType: 'development',
        complexity: ComplexityLevel.MEDIUM,
        tags: ['agile', 'scrum'],
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'template-2',
        name: 'Kanban Flow Process',
        description: 'Continuous flow kanban process',
        industry: 'software',
        processType: 'development',
        complexity: ComplexityLevel.MEDIUM,
        tags: ['agile', 'kanban'],
        createdAt: new Date('2024-01-02'),
      },
    ];

    const mockCachedResults = [
      {
        id: 'cache-1',
        query: 'agile development best practices',
        title: 'Agile Manifesto Principles',
        content: 'Core principles of agile development',
        description: 'Core principles of agile development',
        url: 'https://agilemanifesto.org',
        relevance: 0.9,
        relevanceScore: 0.9,  // Add this for compatibility with domain interface
        source: 'web' as const,
        author: 'Agile Alliance',
        publishedAt: new Date('2023-06-01'),
        tags: ['agile'],
        citations: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    it('should search and return best practices successfully', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue(mockKnowledgeTemplates);
      cacheRepository.findByQuery.mockResolvedValue(mockCachedResults as any);

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.query).toBe(validInput.query);
      expect(result.results).toHaveLength(3); // 2 from knowledge + 1 from cache
      expect(result.totalResults).toBe(3);
      expect(result.searchedAt).toBeInstanceOf(Date);
      expect(result.filters).toEqual(validInput.filters);

      // Verify knowledge results
      const knowledgeResults = result.results.filter(r => r.source === 'knowledge_base');
      expect(knowledgeResults).toHaveLength(2);
      expect(knowledgeResults[0].title).toBe('Agile Sprint Process');

      // Verify cached results
      const cachedResults = result.results.filter(r => r.source === 'web_research');
      expect(cachedResults).toHaveLength(1);
      expect(cachedResults[0].title).toBe('Agile Manifesto Principles');

      expect(knowledgeService.getRelatedTemplates).toHaveBeenCalledWith({
        query: validInput.query,
        industry: 'software',
        processType: 'development',
        category: 'development',
        complexity: ComplexityLevel.MEDIUM,
      });

      expect(cacheRepository.findByQuery).toHaveBeenCalledWith(validInput.query, {
        limit: 20,
      });
    });

    it('should apply limit correctly', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          ...mockKnowledgeTemplates[0],
          id: `template-${i}`,
          name: `Template ${i}`,
        })),
      );
      cacheRepository.findByQuery.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          ...mockCachedResults[0],
          id: `cache-${i}`,
          title: `Cached ${i}`,
        })) as any,
      );

      const result = await useCase.execute({ ...validInput, limit: 5 });

      expect(result.results).toHaveLength(5);
      expect(result.totalResults).toBe(25);
    });

    it('should apply default limit when not specified', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          ...mockKnowledgeTemplates[0],
          id: `template-${i}`,
          name: `Template ${i}`,
        })),
      );
      cacheRepository.findByQuery.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          ...mockCachedResults[0],
          id: `cache-${i}`,
          title: `Cached ${i}`,
        })) as any,
      );

      const result = await useCase.execute({
        userId: 1,
        query: 'test query',
      });

      expect(result.results).toHaveLength(20); // Default limit
      expect(result.totalResults).toBe(30);
    });

    it('should trigger web research when results are insufficient', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue([mockKnowledgeTemplates[0]]);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([
        {
          title: 'New Research',
          content: 'Fresh content',
          url: 'https://example.com',
          relevance: 0.8,
        },
      ]);

      await useCase.execute(validInput);

      // Verify web research was triggered (fire and forget)
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async call
      expect(researchService.performResearch).toHaveBeenCalled();
    });

    it('should not trigger web research when results are sufficient', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          ...mockKnowledgeTemplates[0],
          id: `template-${i}`,
        })),
      );
      cacheRepository.findByQuery.mockResolvedValue([]);

      await useCase.execute(validInput);

      expect(researchService.performResearch).not.toHaveBeenCalled();
    });

    it('should handle empty results gracefully', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue([]);
      cacheRepository.findByQuery.mockResolvedValue([]);

      const result = await useCase.execute(validInput);

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });

    it('should filter results based on filters', async () => {
      const mixedTemplates = [
        { ...mockKnowledgeTemplates[0], industry: 'software' },
        { ...mockKnowledgeTemplates[1], industry: 'finance' },
      ];
      knowledgeService.getRelatedTemplates.mockResolvedValue(mixedTemplates);
      cacheRepository.findByQuery.mockResolvedValue([]);

      const result = await useCase.execute({
        ...validInput,
        filters: { industry: 'software' },
      });

      // The filtering happens in combineAndRankResults
      expect(result.results.every(r => r.industry === 'software' || !r.industry)).toBe(true);
    });

    it('should remove duplicate results', async () => {
      const duplicateTemplate = {
        ...mockKnowledgeTemplates[0],
        id: 'duplicate-1',
      };
      knowledgeService.getRelatedTemplates.mockResolvedValue([
        mockKnowledgeTemplates[0],
        duplicateTemplate, // Same title
      ]);
      cacheRepository.findByQuery.mockResolvedValue([]);

      const result = await useCase.execute(validInput);

      // Should remove duplicate based on title
      const titles = result.results.map(r => r.title);
      const uniqueTitles = [...new Set(titles)];
      expect(titles.length).toBe(uniqueTitles.length);
    });

    it('should sort results by relevance', async () => {
      const templates = [
        { ...mockKnowledgeTemplates[0], name: 'Low relevance template' },
        { ...mockKnowledgeTemplates[1], name: 'Agile development best practices guide' },
      ];
      knowledgeService.getRelatedTemplates.mockResolvedValue(templates);
      cacheRepository.findByQuery.mockResolvedValue([]);

      const result = await useCase.execute(validInput);

      // Results should be sorted by relevance (descending)
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].relevance).toBeGreaterThanOrEqual(
          result.results[i].relevance,
        );
      }
    });

    it('should throw error if query is missing', async () => {
      const invalidInput = {
        ...validInput,
        query: '',
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow('Query is required');
    });

    it('should throw error if user ID is missing', async () => {
      const invalidInput = {
        ...validInput,
        userId: undefined as any,
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow('User ID is required');
    });

    it('should throw error if limit is invalid', async () => {
      const invalidInput = {
        ...validInput,
        limit: 0,
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'Limit must be greater than 0',
      );
    });

    it('should handle knowledge service errors gracefully', async () => {
      knowledgeService.getRelatedTemplates.mockRejectedValue(
        new Error('Knowledge service error'),
      );
      cacheRepository.findByQuery.mockResolvedValue(mockCachedResults as any);

      const result = await useCase.execute(validInput);

      // Should still return cached results
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe('web_research');
    });

    it('should handle cache repository errors gracefully', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue(mockKnowledgeTemplates);
      cacheRepository.findByQuery.mockRejectedValue(new Error('Cache error'));

      const result = await useCase.execute(validInput);

      // Should still return knowledge results
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.source === 'knowledge_base')).toBe(true);
    });

    it('should handle web research errors gracefully', async () => {
      knowledgeService.getRelatedTemplates.mockResolvedValue([]);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockRejectedValue(
        new Error('Research service error'),
      );

      // Should not throw, as web research is fire-and-forget
      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(0);
    });

    it('should correctly calculate relevance scores', async () => {
      const template = {
        ...mockKnowledgeTemplates[0],
        name: 'Agile Development Best Practices Complete Guide',
        description: 'Comprehensive guide for agile development',
      };
      knowledgeService.getRelatedTemplates.mockResolvedValue([template]);
      cacheRepository.findByQuery.mockResolvedValue([]);

      const result = await useCase.execute({
        userId: 1,
        query: 'agile development',
      });

      // Should have high relevance as query matches title
      expect(result.results[0].relevance).toBeGreaterThan(0.5);
    });

    it('should filter by tags correctly', async () => {
      const templates = [
        { ...mockKnowledgeTemplates[0], tags: ['agile', 'scrum'] },
        { ...mockKnowledgeTemplates[1], tags: ['waterfall'] },
      ];
      knowledgeService.getRelatedTemplates.mockResolvedValue(templates);
      cacheRepository.findByQuery.mockResolvedValue([]);

      const result = await useCase.execute({
        userId: 1,
        query: 'process',
        filters: { tags: ['agile'] },
      });

      // Should only include results with matching tags
      const filteredResults = result.results.filter(r => r.tags?.includes('agile'));
      expect(filteredResults.length).toBeGreaterThan(0);
      const nonMatchingResults = result.results.filter(
        r => r.tags && r.tags.length > 0 && !r.tags.includes('agile'),
      );
      expect(nonMatchingResults).toHaveLength(0);
    });
  });
});