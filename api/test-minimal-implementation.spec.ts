import { Test, TestingModule } from '@nestjs/testing';
import { SearchBestPracticesUseCase } from './src/application/usecases/ai-agent/search-best-practices.usecase';
import { KnowledgeBaseService } from './src/domain/ai-agent/services/knowledge-base.service';
import { WebResearchService } from './src/domain/ai-agent/services/web-research.service';
import { ComplexityLevel } from './src/domain/ai-agent/entities/process-analysis.entity';

describe('Minimal Implementation Test', () => {
  it('should verify mock works correctly', async () => {
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
            findByQuery: jest.fn().mockResolvedValue([
              {
                id: 'test-1',
                title: 'Test Result',
                content: 'Test content',
                relevance: 0.9,
                relevanceScore: 0.9,
                url: 'https://example.com',
                source: 'web',
              },
            ]),
            storeBatch: jest.fn(),
          },
        },
        {
          provide: KnowledgeBaseService,
          useValue: {
            getRelatedTemplates: jest.fn().mockResolvedValue([]),
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

    const useCase = module.get<SearchBestPracticesUseCase>(SearchBestPracticesUseCase);
    const cacheRepo = module.get('WebResearchCacheRepository');
    
    const result = await useCase.execute({
      userId: 1,
      query: 'test query',
      filters: {
        industry: 'software',
        processType: 'development',
        complexity: ComplexityLevel.MEDIUM,
        tags: ['test'],
      },
    });
    
    console.log('Result:', {
      totalResults: result.totalResults,
      resultsLength: result.results.length,
      sources: result.results.map(r => r.source),
    });
    
    expect(cacheRepo.findByQuery).toHaveBeenCalledWith('test query', { limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].source).toBe('web_research');
  });
});