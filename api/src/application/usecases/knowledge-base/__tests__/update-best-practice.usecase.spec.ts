import { Test, TestingModule } from '@nestjs/testing';
import { UpdateBestPracticeUseCase } from '../update-best-practice.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('UpdateBestPracticeUseCase', () => {
  let useCase: UpdateBestPracticeUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateBestPracticeUseCase,
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

    useCase = module.get<UpdateBestPracticeUseCase>(UpdateBestPracticeUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should update a best practice successfully with all fields', async () => {
        // Arrange
        const id = 'bp-001';
        const input = {
          title: 'Updated CI/CD Best Practices',
          description: 'Updated guidelines for CI/CD implementation',
          category: 'efficiency' as const,
          content: {
            problem: 'Updated problem description',
            solution: 'Updated solution approach',
            benefits: ['Improved efficiency', 'Better quality'],
            implementation: 'Updated implementation guide',
            metrics: ['Build time', 'Deploy frequency'],
            tools: ['GitLab CI', 'ArgoCD'],
            references: ['https://updated-example.com'],
          },
          applicableProcessTypes: ['devops', 'agile'],
          tags: ['continuous-integration', 'continuous-deployment'],
          confidenceScore: 0.98,
          isActive: true,
        };

        const expectedResult = TestDataFactory.createMockBestPractice({
          id,
          title: input.title,
          description: input.description,
          category: input.category,
          content: input.content,
          applicableProcessTypes: input.applicableProcessTypes,
          tags: input.tags,
          confidenceScore: input.confidenceScore,
          isActive: input.isActive,
        });

        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.updateBestPractice).toHaveBeenCalledWith(id, {
          title: input.title,
          description: input.description,
          category: input.category,
          content: input.content,
          applicableProcessTypes: input.applicableProcessTypes,
          tags: input.tags,
          confidenceScore: input.confidenceScore,
          isActive: input.isActive,
        });
      });

      it('should update best practice with partial fields', async () => {
        // Arrange
        const id = 'bp-002';
        const input = {
          title: 'Updated Title Only',
          confidenceScore: 0.85,
          isActive: false,
        };

        const expectedResult = TestDataFactory.createMockBestPractice({
          id,
          title: input.title,
          confidenceScore: input.confidenceScore,
          isActive: input.isActive,
        });

        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.updateBestPractice).toHaveBeenCalledWith(id, {
          title: input.title,
          confidenceScore: input.confidenceScore,
          isActive: input.isActive,
        });
      });

      it('should update only content without other fields', async () => {
        // Arrange
        const id = 'bp-003';
        const input = {
          content: {
            problem: 'New problem',
            solution: 'New solution',
            benefits: ['New benefit'],
            implementation: 'New implementation',
          },
        };

        const expectedResult = TestDataFactory.createMockBestPractice({
          id,
          content: input.content,
        });

        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
      });

      it('should update isActive status', async () => {
        // Arrange
        const id = 'bp-004';
        const input = {
          isActive: false,
        };

        const expectedResult = TestDataFactory.createMockBestPractice({
          id,
          isActive: false,
        });

        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result.isActive).toBe(false);
      });

      it('should handle maximum allowed arrays', async () => {
        // Arrange
        const id = 'bp-005';
        const input = {
          content: {
            problem: 'Problem',
            solution: 'Solution',
            benefits: Array(20).fill('Benefit'),
            implementation: 'Implementation',
            metrics: Array(15).fill('Metric'),
            tools: Array(20).fill('Tool'),
            references: Array(10).fill('https://example.com'),
          },
          applicableProcessTypes: Array(50).fill('process'),
          tags: Array(20).fill('tag'),
        };

        const expectedResult = TestDataFactory.createMockBestPractice();
        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('異常系', () => {
      describe('ID validation', () => {
        it('should throw when ID is empty', async () => {
          // Arrange
          const input = { title: 'Test' };

          // Act & Assert
          await expect(useCase.execute('', input)).rejects.toThrow(
            new DomainException('Best practice ID is required'),
          );
        });

        it('should throw when ID format is invalid', async () => {
          // Arrange
          const input = { title: 'Test' };

          // Act & Assert
          await expect(useCase.execute('invalid-format', input)).rejects.toThrow(
            new DomainException('Invalid best practice ID format'),
          );
        });
      });

      describe('Updates validation', () => {
        it('should throw when no update fields are provided', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {};

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('At least one field must be provided for update'),
          );
        });

        it('should throw when updates is not an object', async () => {
          // Arrange
          const id = 'bp-001';
          const input = 'not-an-object' as any;

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Updates must be an object'),
          );
        });
      });

      describe('title validation', () => {
        it('should throw when title is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { title: '' };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Best practice title cannot be empty'),
          );
        });

        it('should throw when title is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { title: 'a'.repeat(201) };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Best practice title must be less than 200 characters'),
          );
        });
      });

      describe('description validation', () => {
        it('should throw when description is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { description: '' };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Best practice description cannot be empty'),
          );
        });

        it('should throw when description is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { description: 'a'.repeat(1001) };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Best practice description must be less than 1000 characters'),
          );
        });
      });

      describe('category validation', () => {
        it('should throw when category is invalid', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { category: 'invalid-category' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Invalid best practice category'),
          );
        });
      });

      describe('content validation', () => {
        it('should throw when content is not an object', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { content: 'not-an-object' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Content must be an object'),
          );
        });

        it('should throw when problem is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: '',
              solution: 'Solution',
              benefits: ['Benefit'],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Problem description cannot be empty'),
          );
        });

        it('should throw when problem is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'a'.repeat(1001),
              solution: 'Solution',
              benefits: ['Benefit'],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Problem description must be less than 1000 characters'),
          );
        });

        it('should throw when solution is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: '',
              benefits: ['Benefit'],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Solution description cannot be empty'),
          );
        });

        it('should throw when solution is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'a'.repeat(2001),
              benefits: ['Benefit'],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Solution description must be less than 2000 characters'),
          );
        });

        it('should throw when benefits is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: [],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('At least one benefit is required'),
          );
        });

        it('should throw when benefits exceeds limit', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: Array(21).fill('Benefit'),
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 20 benefits'),
          );
        });

        it('should throw when a benefit is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: ['Valid benefit', ''],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Benefit cannot be empty'),
          );
        });

        it('should throw when a benefit is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: ['a'.repeat(501)],
              implementation: 'Implementation',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Benefit must be less than 500 characters'),
          );
        });

        it('should throw when implementation is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: ['Benefit'],
              implementation: '',
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Implementation guide cannot be empty'),
          );
        });

        it('should throw when implementation is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: ['Benefit'],
              implementation: 'a'.repeat(3001),
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Implementation guide must be less than 3000 characters'),
          );
        });

        it('should throw when a reference URL is invalid', async () => {
          // Arrange
          const id = 'bp-001';
          const input = {
            content: {
              problem: 'Problem',
              solution: 'Solution',
              benefits: ['Benefit'],
              implementation: 'Implementation',
              references: ['not-a-url'],
            },
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Reference must be a valid URL'),
          );
        });
      });

      describe('applicableProcessTypes validation', () => {
        it('should throw when applicableProcessTypes is not an array', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { applicableProcessTypes: 'not-an-array' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Applicable process types must be an array'),
          );
        });

        it('should throw when applicableProcessTypes exceeds limit', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { applicableProcessTypes: Array(51).fill('process') };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 50 applicable process types'),
          );
        });

        it('should throw when a process type is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { applicableProcessTypes: ['valid', ''] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Applicable process type cannot be empty'),
          );
        });

        it('should throw when a process type is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { applicableProcessTypes: ['a'.repeat(101)] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Applicable process type must be less than 100 characters'),
          );
        });
      });

      describe('tags validation', () => {
        it('should throw when tags is not an array', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { tags: 'not-an-array' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Tags must be an array'),
          );
        });

        it('should throw when tags exceeds limit', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { tags: Array(21).fill('tag') };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 20 tags'),
          );
        });

        it('should throw when a tag is empty', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { tags: ['valid-tag', ''] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Tag cannot be empty'),
          );
        });

        it('should throw when a tag is too long', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { tags: ['a'.repeat(51)] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Tag must be less than 50 characters'),
          );
        });
      });

      describe('confidenceScore validation', () => {
        it('should throw when confidence score is out of range', async () => {
          // Arrange
          const id = 'bp-001';
          const invalidScores = [-0.1, 1.1, 2.0];

          for (const score of invalidScores) {
            const input = { confidenceScore: score };

            // Act & Assert
            await expect(useCase.execute(id, input)).rejects.toThrow(
              new DomainException('Confidence score must be between 0 and 1'),
            );
          }
        });

        it('should throw when confidence score is not a number', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { confidenceScore: 'not-a-number' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Confidence score must be a number'),
          );
        });
      });

      describe('isActive validation', () => {
        it('should throw when isActive is not a boolean', async () => {
          // Arrange
          const id = 'bp-001';
          const input = { isActive: 'not-a-boolean' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('isActive must be a boolean'),
          );
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const id = 'bp-001';
        const input = { title: 'Test' };
        const serviceError = new Error('Database error');
        knowledgeBaseManagerService.updateBestPractice.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(id, input)).rejects.toThrow('Database error');
      });
    });

    describe('境界値テスト', () => {
      it('should accept maximum valid lengths', async () => {
        // Arrange
        const id = 'bp-001';
        const mockResult = TestDataFactory.createMockBestPractice();
        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(mockResult);

        // Title at max length
        await expect(useCase.execute(id, {
          title: 'a'.repeat(200),
        })).resolves.toBeDefined();

        // Description at max length
        await expect(useCase.execute(id, {
          description: 'a'.repeat(1000),
        })).resolves.toBeDefined();
      });

      it('should accept confidence score at boundaries', async () => {
        // Arrange
        const id = 'bp-001';
        const mockResult = TestDataFactory.createMockBestPractice();
        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(mockResult);

        // Minimum valid
        await expect(useCase.execute(id, {
          confidenceScore: 0,
        })).resolves.toBeDefined();

        // Maximum valid
        await expect(useCase.execute(id, {
          confidenceScore: 1,
        })).resolves.toBeDefined();
      });

      it('should accept content fields at maximum lengths', async () => {
        // Arrange
        const id = 'bp-001';
        const mockResult = TestDataFactory.createMockBestPractice();
        knowledgeBaseManagerService.updateBestPractice.mockResolvedValue(mockResult);

        const input = {
          content: {
            problem: 'a'.repeat(1000),
            solution: 'a'.repeat(2000),
            benefits: ['a'.repeat(500)],
            implementation: 'a'.repeat(3000),
          },
        };

        // Act & Assert
        await expect(useCase.execute(id, input)).resolves.toBeDefined();
      });
    });
  });
});