import { Test, TestingModule } from '@nestjs/testing';
import { GetIndustryTemplatesUseCase } from '../get-industry-templates.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('GetIndustryTemplatesUseCase', () => {
  let useCase: GetIndustryTemplatesUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIndustryTemplatesUseCase,
        {
          provide: KnowledgeBaseManagerService,
          useValue: {
            getIndustryTemplates: jest.fn(),
            createIndustryTemplate: jest.fn(),
            updateIndustryTemplate: jest.fn(),
            deleteIndustryTemplate: jest.fn(),
            getProcessTypes: jest.fn(),
            createProcessType: jest.fn(),
            updateProcessType: jest.fn(),
            deleteProcessType: jest.fn(),
            getBestPractices: jest.fn(),
            createBestPractice: jest.fn(),
            updateBestPractice: jest.fn(),
            bulkUpdateBestPractices: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetIndustryTemplatesUseCase>(GetIndustryTemplatesUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should return industry templates with default parameters', async () => {
        // Arrange
        const mockTemplates = [
          TestDataFactory.createMockIndustryTemplate(),
          TestDataFactory.createMockIndustryTemplate({ 
            id: 'ind-002', 
            name: 'Healthcare' 
          }),
        ];

        const mockResponse = {
          templates: mockTemplates,
          total: 2,
        };

        knowledgeBaseManagerService.getIndustryTemplates.mockResolvedValue(mockResponse);

        // Act
        const result = await useCase.execute({});

        // Assert
        expect(result.templates).toEqual(mockTemplates);
        expect(result.total).toBe(2);
        expect(result.offset).toBe(0);
        expect(result.limit).toBe(20);
        expect(knowledgeBaseManagerService.getIndustryTemplates).toHaveBeenCalledWith({
          limit: 20,
          offset: 0,
        });
      });

      it('should pass query parameters correctly to service', async () => {
        // Arrange
        const input = {
          industry: 'healthcare',
          search: 'patient',
          regulation: 'HIPAA',
          isActive: true,
          minConfidence: 0.8,
          limit: 10,
          offset: 5,
        };

        const mockResponse = {
          templates: [],
          total: 0,
        };

        knowledgeBaseManagerService.getIndustryTemplates.mockResolvedValue(mockResponse);

        // Act
        await useCase.execute(input);

        // Assert
        expect(knowledgeBaseManagerService.getIndustryTemplates).toHaveBeenCalledWith({
          industry: 'healthcare',
          search: 'patient',
          regulation: 'HIPAA',
          isActive: true,
          minConfidence: 0.8,
          limit: 10,
          offset: 5,
        });
      });

      it('should handle empty result set', async () => {
        // Arrange
        const mockResponse = {
          templates: [],
          total: 0,
        };

        knowledgeBaseManagerService.getIndustryTemplates.mockResolvedValue(mockResponse);

        // Act
        const result = await useCase.execute({ search: 'nonexistent' });

        // Assert
        expect(result.templates).toEqual([]);
        expect(result.total).toBe(0);
      });
    });

    describe('異常系', () => {
      it('should throw DomainException when limit is less than 1', async () => {
        // Arrange
        const input = { limit: 0 };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Limit must be between 1 and 100'),
        );
        expect(knowledgeBaseManagerService.getIndustryTemplates).not.toHaveBeenCalled();
      });

      it('should throw DomainException when limit exceeds 100', async () => {
        // Arrange
        const input = { limit: 101 };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Limit must be between 1 and 100'),
        );
      });

      it('should throw DomainException when offset is negative', async () => {
        // Arrange
        const input = { offset: -1 };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Offset must be non-negative'),
        );
      });

      it('should throw DomainException when minConfidence is out of range', async () => {
        // Arrange
        const invalidValues = [-0.1, 1.1, 2.0];

        // Act & Assert
        for (const value of invalidValues) {
          await expect(useCase.execute({ minConfidence: value })).rejects.toThrow(
            new DomainException('Minimum confidence must be between 0 and 1'),
          );
        }
      });

      it('should throw DomainException when search query is too long', async () => {
        // Arrange
        const input = { search: 'a'.repeat(201) };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Search query must be less than 200 characters'),
        );
      });

      it('should throw DomainException when regulation filter is too long', async () => {
        // Arrange
        const input = { regulation: 'a'.repeat(101) };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Regulation filter must be less than 100 characters'),
        );
      });

      it('should throw DomainException when process filter is too long', async () => {
        // Arrange
        const input = { process: 'a'.repeat(101) };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new DomainException('Process filter must be less than 100 characters'),
        );
      });

      it('should propagate service errors', async () => {
        // Arrange
        const serviceError = new Error('Database connection failed');
        knowledgeBaseManagerService.getIndustryTemplates.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute({})).rejects.toThrow('Database connection failed');
      });
    });

    describe('境界値テスト', () => {
      it('should accept limit at boundaries', async () => {
        // Arrange
        const mockResponse = { templates: [], total: 0 };
        knowledgeBaseManagerService.getIndustryTemplates.mockResolvedValue(mockResponse);

        // Act & Assert - minimum valid
        await expect(useCase.execute({ limit: 1 })).resolves.toBeDefined();

        // Act & Assert - maximum valid
        await expect(useCase.execute({ limit: 100 })).resolves.toBeDefined();
      });

      it('should accept confidence score at boundaries', async () => {
        // Arrange
        const mockResponse = { templates: [], total: 0 };
        knowledgeBaseManagerService.getIndustryTemplates.mockResolvedValue(mockResponse);

        // Act & Assert - minimum valid
        await expect(useCase.execute({ minConfidence: 0 })).resolves.toBeDefined();

        // Act & Assert - maximum valid
        await expect(useCase.execute({ minConfidence: 1 })).resolves.toBeDefined();
      });

      it('should accept string lengths at maximum boundary', async () => {
        // Arrange
        const mockResponse = { templates: [], total: 0 };
        knowledgeBaseManagerService.getIndustryTemplates.mockResolvedValue(mockResponse);

        // Act & Assert - search at max length
        await expect(useCase.execute({ search: 'a'.repeat(200) })).resolves.toBeDefined();

        // Act & Assert - regulation at max length
        await expect(useCase.execute({ regulation: 'a'.repeat(100) })).resolves.toBeDefined();

        // Act & Assert - process at max length
        await expect(useCase.execute({ process: 'a'.repeat(100) })).resolves.toBeDefined();
      });
    });
  });
});