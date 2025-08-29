import { Test, TestingModule } from '@nestjs/testing';
import { GetBestPracticesUseCase } from '../get-best-practices.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('GetBestPracticesUseCase', () => {
  let useCase: GetBestPracticesUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBestPracticesUseCase,
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

    useCase = module.get<GetBestPracticesUseCase>(GetBestPracticesUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should return best practices with default parameters', async () => {
        // Arrange
        const mockPractices = [
          TestDataFactory.createMockBestPractice(),
          TestDataFactory.createMockBestPractice({
            id: 'bp-002',
            title: 'Code Review Standards',
          }),
        ];

        const mockResponse = {
          practices: mockPractices,
          total: 2,
        };

        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        const result = await useCase.execute({});

        // Assert
        expect(result.practices).toEqual(mockPractices);
        expect(result.total).toBe(2);
        expect(result.offset).toBe(0);
        expect(result.limit).toBe(20);
        expect(knowledgeBaseManagerService.getBestPractices).toHaveBeenCalledWith({
          limit: 20,
          offset: 0,
        });
      });

      it('should pass all query parameters correctly to service', async () => {
        // Arrange
        const input = {
          category: 'quality' as const,
          industry: 'software',
          processType: 'agile',
          search: 'testing',
          tags: ['automation', 'ci/cd'],
          isActive: true,
          minConfidence: 0.8,
          limit: 10,
          offset: 5,
        };

        const mockResponse = {
          practices: [],
          total: 0,
        };

        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        await useCase.execute(input);

        // Assert
        expect(knowledgeBaseManagerService.getBestPractices).toHaveBeenCalledWith({
          category: 'quality',
          industry: 'software',
          processType: 'agile',
          search: 'testing',
          tags: ['automation', 'ci/cd'],
          isActive: true,
          minConfidence: 0.8,
          limit: 10,
          offset: 5,
        });
      });

      it('should handle empty result set', async () => {
        // Arrange
        const mockResponse = {
          practices: [],
          total: 0,
        };

        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        const result = await useCase.execute({ search: 'nonexistent' });

        // Assert
        expect(result.practices).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.offset).toBe(0);
        expect(result.limit).toBe(20);
      });

      it('should filter by single tag', async () => {
        // Arrange
        const query = { tags: ['agile'] };
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        await useCase.execute(query);

        // Assert
        expect(knowledgeBaseManagerService.getBestPractices).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['agile'],
          }),
        );
      });

      it('should filter by multiple tags', async () => {
        // Arrange
        const query = { tags: ['agile', 'scrum', 'kanban'] };
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        await useCase.execute(query);

        // Assert
        expect(knowledgeBaseManagerService.getBestPractices).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['agile', 'scrum', 'kanban'],
          }),
        );
      });
    });

    describe('異常系', () => {
      describe('Pagination validation', () => {
        it('should throw when limit is less than 1', async () => {
          // Arrange
          const input = { limit: 0 };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Limit must be between 1 and 100'),
          );
          expect(knowledgeBaseManagerService.getBestPractices).not.toHaveBeenCalled();
        });

        it('should throw when limit exceeds 100', async () => {
          // Arrange
          const input = { limit: 101 };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Limit must be between 1 and 100'),
          );
        });

        it('should throw when offset is negative', async () => {
          // Arrange
          const input = { offset: -1 };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Offset must be non-negative'),
          );
        });

        it('should throw when limit is not a number', async () => {
          // Arrange
          const input = { limit: 'not-a-number' as any };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Limit must be a number'),
          );
        });

        it('should throw when offset is not a number', async () => {
          // Arrange
          const input = { offset: 'not-a-number' as any };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Offset must be a number'),
          );
        });
      });

      describe('Filter validation', () => {
        it('should throw when category is invalid', async () => {
          // Arrange
          const input = { category: 'invalid-category' as any };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Invalid best practice category'),
          );
        });

        it('should throw when minConfidence is out of range', async () => {
          // Arrange
          const invalidValues = [-0.1, 1.1, 2.0];

          // Act & Assert
          for (const value of invalidValues) {
            await expect(useCase.execute({ minConfidence: value })).rejects.toThrow(
              new DomainException('Minimum confidence must be between 0 and 1'),
            );
          }
        });

        it('should throw when minConfidence is not a number', async () => {
          // Arrange
          const input = { minConfidence: 'not-a-number' as any };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Minimum confidence must be a number'),
          );
        });

        it('should throw when search query is too long', async () => {
          // Arrange
          const input = { search: 'a'.repeat(201) };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Search query must be less than 200 characters'),
          );
        });

        it('should throw when industry filter is too long', async () => {
          // Arrange
          const input = { industry: 'a'.repeat(101) };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Industry filter must be less than 100 characters'),
          );
        });

        it('should throw when processType filter is too long', async () => {
          // Arrange
          const input = { processType: 'a'.repeat(101) };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Process type filter must be less than 100 characters'),
          );
        });

        it('should throw when tags is not an array', async () => {
          // Arrange
          const input = { tags: 'not-an-array' as any };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Tags must be an array'),
          );
        });

        it('should throw when tags exceeds limit', async () => {
          // Arrange
          const input = { tags: Array(11).fill('tag') };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot filter by more than 10 tags'),
          );
        });

        it('should throw when a tag is empty', async () => {
          // Arrange
          const input = { tags: ['valid-tag', ''] };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Tag filter cannot be empty'),
          );
        });

        it('should throw when a tag is too long', async () => {
          // Arrange
          const input = { tags: ['a'.repeat(51)] };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Tag filter must be less than 50 characters'),
          );
        });

        it('should throw when isActive is not a boolean', async () => {
          // Arrange
          const input = { isActive: 'not-a-boolean' as any };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('isActive must be a boolean'),
          );
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const serviceError = new Error('Database connection failed');
        knowledgeBaseManagerService.getBestPractices.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute({})).rejects.toThrow('Database connection failed');
      });
    });

    describe('境界値テスト', () => {
      it('should accept limit at boundaries', async () => {
        // Arrange
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act & Assert - minimum valid
        await expect(useCase.execute({ limit: 1 })).resolves.toBeDefined();

        // Act & Assert - maximum valid
        await expect(useCase.execute({ limit: 100 })).resolves.toBeDefined();
      });

      it('should accept confidence score at boundaries', async () => {
        // Arrange
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act & Assert - minimum valid
        await expect(useCase.execute({ minConfidence: 0 })).resolves.toBeDefined();

        // Act & Assert - maximum valid
        await expect(useCase.execute({ minConfidence: 1 })).resolves.toBeDefined();
      });

      it('should accept string lengths at maximum boundary', async () => {
        // Arrange
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act & Assert - search at max length
        await expect(useCase.execute({ search: 'a'.repeat(200) })).resolves.toBeDefined();

        // Act & Assert - industry at max length
        await expect(useCase.execute({ industry: 'a'.repeat(100) })).resolves.toBeDefined();

        // Act & Assert - processType at max length
        await expect(useCase.execute({ processType: 'a'.repeat(100) })).resolves.toBeDefined();

        // Act & Assert - tag at max length
        await expect(useCase.execute({ tags: ['a'.repeat(50)] })).resolves.toBeDefined();
      });

      it('should accept maximum number of tags', async () => {
        // Arrange
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);
        
        const tags = Array(10).fill(0).map((_, i) => `tag-${i}`);

        // Act & Assert
        await expect(useCase.execute({ tags })).resolves.toBeDefined();
      });

      it('should handle large offset values', async () => {
        // Arrange
        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(useCase.execute({ offset: 1000000 })).resolves.toBeDefined();
      });
    });

    describe('複合条件テスト', () => {
      it('should combine multiple filters correctly', async () => {
        // Arrange
        const input = {
          category: 'efficiency' as const,
          industry: 'software',
          processType: 'agile',
          search: 'sprint',
          tags: ['scrum', 'planning'],
          isActive: true,
          minConfidence: 0.7,
          limit: 50,
          offset: 10,
        };

        const mockResponse = {
          practices: [TestDataFactory.createMockBestPractice()],
          total: 1,
        };

        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.practices).toHaveLength(1);
        expect(knowledgeBaseManagerService.getBestPractices).toHaveBeenCalledWith(input);
      });

      it('should handle partial filter combinations', async () => {
        // Arrange
        const input = {
          category: 'quality' as const,
          tags: ['testing'],
          limit: 25,
        };

        const mockResponse = { practices: [], total: 0 };
        knowledgeBaseManagerService.getBestPractices.mockResolvedValue(mockResponse);

        // Act
        await useCase.execute(input);

        // Assert
        expect(knowledgeBaseManagerService.getBestPractices).toHaveBeenCalledWith({
          category: 'quality',
          tags: ['testing'],
          limit: 25,
          offset: 0,
        });
      });
    });
  });
});