import { Test, TestingModule } from '@nestjs/testing';
import { SearchComplianceRequirementsUseCase } from './search-compliance-requirements.usecase';
import { ProcessKnowledgeRepository } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { WebResearchCacheRepository } from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
import { WebResearchService } from '../../../domain/ai-agent/services/web-research.service';
import { InformationValidationService } from '../../../domain/ai-agent/services/information-validation.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { ComplianceSeverity, ComplianceSource } from '../../dto/ai-agent/compliance-requirements.dto';

describe('SearchComplianceRequirementsUseCase', () => {
  let useCase: SearchComplianceRequirementsUseCase;
  let knowledgeRepository: jest.Mocked<ProcessKnowledgeRepository>;
  let cacheRepository: jest.Mocked<WebResearchCacheRepository>;
  let researchService: jest.Mocked<WebResearchService>;
  let validationService: jest.Mocked<InformationValidationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchComplianceRequirementsUseCase,
        {
          provide: 'ProcessKnowledgeRepository',
          useValue: {
            findByCategory: jest.fn(),
            findByIndustry: jest.fn(),
            findByTags: jest.fn(),
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
          provide: WebResearchService,
          useValue: {
            performResearch: jest.fn(),
          },
        },
        {
          provide: InformationValidationService,
          useValue: {
            // InformationValidationService doesn't have validateInformation method
            // We'll mock other methods if needed
          },
        },
      ],
    }).compile();

    useCase = module.get<SearchComplianceRequirementsUseCase>(SearchComplianceRequirementsUseCase);
    knowledgeRepository = module.get('ProcessKnowledgeRepository');
    cacheRepository = module.get('WebResearchCacheRepository');
    researchService = module.get(WebResearchService);
    validationService = module.get(InformationValidationService);
  });

  describe('execute', () => {
    const validInput = {
      userId: 1,
      query: 'data protection regulations',
      filters: {
        industry: 'healthcare',
        region: 'EU',
        category: 'data-privacy',
        severity: ComplianceSeverity.CRITICAL,
      },
      limit: 10,
    };

    // Helper function to create valid ProcessKnowledge mock
    const createMockKnowledgeItem = (overrides: any = {}) => ({
      id: 'comp-1',
      name: 'GDPR Article 32',
      description: 'Security of processing',
      category: 'data-privacy',
      industry: 'healthcare',
      processType: 'compliance',
      title: 'GDPR Article 32',
      content: 'Security of processing',
      source: 'regulatory',
      region: 'EU',
      tags: ['gdpr', 'healthcare', 'EU'],
      ...overrides,
    });

    it('should successfully search compliance requirements', async () => {
      // Arrange
      const mockKnowledgeItems = [createMockKnowledgeItem()];

      const mockWebResults = [
        {
          title: 'HIPAA Compliance',
          content: 'Healthcare data protection requirements',
          url: 'https://example.com/hipaa',
          relevance: 0.8,
        },
      ];

      knowledgeRepository.findByCategory.mockResolvedValue(mockKnowledgeItems);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue(mockWebResults);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result).toBeDefined();
      expect(result.query).toBe(validInput.query);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        severity: expect.any(String),
        industry: 'healthcare',
      });
      expect(result.searchedAt).toBeInstanceOf(Date);
      expect(result.filters).toEqual(validInput.filters);
    });

    it('should throw error when industry filter is missing', async () => {
      // Arrange
      const invalidInput = {
        userId: 1,
        query: 'compliance requirements',
        filters: {
          region: 'US',
        },
        limit: 10,
      };

      // Act & Assert
      await expect(useCase.execute(invalidInput as any)).rejects.toThrow(
        new DomainException('Industry filter is required for compliance search')
      );
    });

    it('should throw error when query is empty', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        query: '',
      };

      // Act & Assert
      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        new DomainException('Query is required')
      );
    });

    it('should throw error for invalid region code', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        filters: {
          ...validInput.filters,
          region: 'INVALID',
        },
      };

      // Act & Assert
      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        new DomainException('Invalid region code. Use ISO 3166 format (e.g., US, EU, JP)')
      );
    });

    it('should use cached results when available', async () => {
      // Arrange
      const cachedResults = [
        {
          id: 'cached-1',
          title: 'Cached GDPR Requirement',
          content: 'Cached compliance data',
          url: 'https://cached.example.com',
          query: 'test-query',
          relevanceScore: 0.9,
          source: 'web' as const,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ];

      knowledgeRepository.findByCategory.mockResolvedValue([]);
      cacheRepository.findByQuery.mockResolvedValue(cachedResults);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(researchService.performResearch).not.toHaveBeenCalled();
    });

    it('should prioritize critical severity requirements', async () => {
      // Arrange
      const mixedSeverityItems = [
        createMockKnowledgeItem({
          id: 'comp-1',
          name: 'Low Priority Requirement',
          description: 'Low severity',
          severity: ComplianceSeverity.LOW,
        }),
        createMockKnowledgeItem({
          id: 'comp-2',
          name: 'Critical Requirement',
          description: 'Critical severity',
          severity: ComplianceSeverity.CRITICAL,
        }),
        createMockKnowledgeItem({
          id: 'comp-3',
          name: 'Medium Priority Requirement',
          description: 'Medium severity',
          severity: ComplianceSeverity.MEDIUM,
        }),
      ];

      knowledgeRepository.findByCategory.mockResolvedValue(mixedSeverityItems);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.results[0].severity).toBe(ComplianceSeverity.CRITICAL);
      expect(result.results[1].severity).toBe(ComplianceSeverity.MEDIUM);
      expect(result.results[2].severity).toBe(ComplianceSeverity.LOW);
    });

    it('should boost relevance for regulatory sources', async () => {
      // Arrange
      const regulatoryItem = createMockKnowledgeItem({
        id: 'reg-1',
        name: 'Official Regulation',
        description: 'From regulatory body',
        relevance: 0.6,
      });

      knowledgeRepository.findByCategory.mockResolvedValue([regulatoryItem]);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.results[0].source).toBe(ComplianceSource.REGULATORY);
      expect(result.results[0].relevance).toBeGreaterThan(0.6);
    });

    it('should handle validation failures gracefully', async () => {
      // Arrange
      const mockItem = createMockKnowledgeItem({
        id: 'comp-1',
        name: 'Requirement with validation error',
        description: 'This will have reduced confidence',
        relevance: 1.0,
      });

      knowledgeRepository.findByCategory.mockResolvedValue([mockItem]);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.results).toHaveLength(1);
      // Source confidence calculation should still work
      expect(result.results[0].relevance).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      // Arrange
      const manyItems = Array.from({ length: 50 }, (_, i) => 
        createMockKnowledgeItem({
          id: `comp-${i}`,
          name: `Requirement ${i}`,
          description: `Description ${i}`,
        })
      );

      knowledgeRepository.findByCategory.mockResolvedValue(manyItems);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([]);

      const inputWithLimit = { ...validInput, limit: 5 };

      // Act
      const result = await useCase.execute(inputWithLimit);

      // Assert
      expect(result.results).toHaveLength(5);
      expect(result.totalResults).toBeGreaterThan(5);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      knowledgeRepository.findByCategory.mockRejectedValue(new Error('Database error'));
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([
        {
          title: 'Web Result',
          content: 'From web search',
          url: 'https://example.com',
          relevance: 0.7,
        },
      ]);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe(ComplianceSource.WEB_RESEARCH);
    });

    it('should extract required actions from description', async () => {
      // Arrange
      const itemWithActions = createMockKnowledgeItem({
        id: 'comp-1',
        name: 'Complex Requirement',
        description: 'Organizations must implement encryption. They should conduct regular audits. Companies need to maintain logs.',
      });

      knowledgeRepository.findByCategory.mockResolvedValue([itemWithActions]);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.results[0].requiredActions).toHaveLength(3);
      expect(result.results[0].requiredActions[0]).toContain('must implement encryption');
    });

    it('should cache web research results', async () => {
      // Arrange
      const webResults = [
        {
          title: 'New Compliance Rule',
          content: 'Fresh from web',
          url: 'https://new.example.com',
          relevance: 0.85,
        },
      ];

      knowledgeRepository.findByCategory.mockResolvedValue([]);
      cacheRepository.findByQuery.mockResolvedValue([]);
      researchService.performResearch.mockResolvedValue(webResults);

      // Act
      await useCase.execute(validInput);

      // Assert
      expect(cacheRepository.storeBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'web',
            expiresAt: expect.any(Date),
          }),
        ])
      );
    });
  });
});