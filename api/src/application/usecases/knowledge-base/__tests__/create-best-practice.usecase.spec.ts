import { Test, TestingModule } from '@nestjs/testing';
import { CreateBestPracticeUseCase } from '../create-best-practice.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';

describe('CreateBestPracticeUseCase', () => {
  let useCase: CreateBestPracticeUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBestPracticeUseCase,
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

    useCase = module.get<CreateBestPracticeUseCase>(CreateBestPracticeUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should create a best practice successfully with all fields', async () => {
        // Arrange
        const input = {
          title: 'Continuous Integration Best Practices',
          description: 'Guidelines for implementing effective CI pipelines',
          category: 'methodology',
          industry: 'software',
          processType: 'development',
          tags: ['ci/cd', 'automation', 'testing'],
          confidence: 0.95,
          source: 'Industry Standard',
          url: 'https://example.com/ci-guide',
        };

        const expectedResult = {
          id: 'bp-123',
          title: input.title,
          description: input.description,
          category: input.category,
          industry: input.industry,
          processType: input.processType,
          tags: input.tags,
          confidence: input.confidence,
          source: input.source,
          url: input.url,
        };

        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.createBestPractice).toHaveBeenCalledWith({
          title: input.title,
          description: input.description,
          category: input.category,
          industry: input.industry,
          processType: input.processType,
          tags: input.tags,
          confidence: input.confidence,
          source: input.source,
          url: input.url,
        });
      });

      it('should create best practice with minimal required fields', async () => {
        // Arrange
        const input = {
          title: 'Minimal Best Practice',
          description: 'Simple description',
          category: 'process',
          tags: ['general'],
          confidence: 0.7,
          source: 'Internal',
        };

        const expectedResult = {
          id: 'bp-124',
          title: input.title,
          description: input.description,
          category: input.category,
          tags: input.tags,
          confidence: input.confidence,
          source: input.source,
        };

        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.createBestPractice).toHaveBeenCalledWith(
          expect.objectContaining({
            title: input.title,
            description: input.description,
            category: input.category,
            tags: input.tags,
            confidence: input.confidence,
            source: input.source,
          }),
        );
      });

      it('should handle maximum allowed tags', async () => {
        // Arrange
        const input = {
          title: 'Complex Best Practice',
          description: 'Description',
          category: 'governance',
          tags: Array(20).fill('tag'),
          confidence: 1.0,
          source: 'External Research',
        };

        const expectedResult = {
          id: 'bp-125',
          title: input.title,
          description: input.description,
          category: input.category,
          tags: input.tags,
          confidence: input.confidence,
          source: input.source,
        };

        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
      });

      it('should create best practice with optional URL', async () => {
        // Arrange
        const input = {
          title: 'Best Practice with URL',
          description: 'Description',
          category: 'tool',
          tags: ['automation'],
          confidence: 0.85,
          source: 'Documentation',
          url: 'https://docs.example.com/best-practices',
        };

        const expectedResult = {
          id: 'bp-126',
          title: input.title,
          description: input.description,
          category: input.category,
          tags: input.tags,
          confidence: input.confidence,
          source: input.source,
          url: input.url,
        };

        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
      });

      it('should create best practice with optional industry and processType', async () => {
        // Arrange
        const input = {
          title: 'Industry Specific Practice',
          description: 'Description',
          category: 'quality',
          industry: 'finance',
          processType: 'compliance',
          tags: ['banking', 'regulation'],
          confidence: 0.9,
          source: 'Financial Authority',
        };

        const expectedResult = {
          id: 'bp-127',
          title: input.title,
          description: input.description,
          category: input.category,
          industry: input.industry,
          processType: input.processType,
          tags: input.tags,
          confidence: input.confidence,
          source: input.source,
        };

        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('異常系', () => {
      describe('title validation', () => {
        it('should throw when title is missing', async () => {
          // Arrange
          const input = {
            title: '',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice title is required'),
          );
        });

        it('should throw when title is too long', async () => {
          // Arrange
          const input = {
            title: 'a'.repeat(201),
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice title must be less than 200 characters'),
          );
        });

        it('should throw when title contains only whitespace', async () => {
          // Arrange
          const input = {
            title: '   ',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice title is required'),
          );
        });
      });

      describe('description validation', () => {
        it('should throw when description is missing', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: '',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice description is required'),
          );
        });

        it('should throw when description is too long', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'a'.repeat(1001),
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice description must be less than 1000 characters'),
          );
        });
      });

      describe('category validation', () => {
        it('should throw when category is invalid', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'invalid-category' as any,
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Invalid best practice category'),
          );
        });

        it('should throw when category is missing', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: '' as any,
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice category is required'),
          );
        });

        it('should accept all valid categories', async () => {
          // Arrange
          const validCategories = ['methodology', 'tool', 'process', 'governance', 'quality'];
          const mockResult = { id: 'bp-test' };
          knowledgeBaseManagerService.createBestPractice.mockResolvedValue(mockResult as any);

          for (const category of validCategories) {
            const input = {
              title: 'Title',
              description: 'Description',
              category,
              tags: ['test'],
              confidence: 0.8,
              source: 'Test Source',
            };

            // Act & Assert
            await expect(useCase.execute(input)).resolves.toBeDefined();
          }
        });
      });

      describe('tags validation', () => {
        it('should throw when tags is not an array', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: 'not-an-array' as any,
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Tags must be an array'),
          );
        });

        it('should throw when tags exceeds limit', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: Array(21).fill('tag'),
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 20 tags'),
          );
        });

        it('should throw when a tag is too long', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['a'.repeat(51)],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Tag must be less than 50 characters'),
          );
        });

        it('should accept empty tags array', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: [],
            confidence: 0.8,
            source: 'Test Source',
          };

          const mockResult = { id: 'bp-test' };
          knowledgeBaseManagerService.createBestPractice.mockResolvedValue(mockResult as any);

          // Act & Assert
          await expect(useCase.execute(input)).resolves.toBeDefined();
        });
      });

      describe('confidence validation', () => {
        it('should throw when confidence score is out of range', async () => {
          // Arrange
          const invalidScores = [-0.1, 1.1, 2.0];

          for (const score of invalidScores) {
            const input = {
              title: 'Title',
              description: 'Description',
              category: 'methodology',
              tags: ['test'],
              confidence: score,
              source: 'Test Source',
            };

            // Act & Assert
            await expect(useCase.execute(input)).rejects.toThrow(
              new DomainException('Confidence score must be between 0 and 1'),
            );
          }
        });

        it('should throw when confidence score is not a number', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 'not-a-number' as any,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Confidence score must be a number'),
          );
        });

        it('should accept boundary values', async () => {
          // Arrange
          const mockResult = { id: 'bp-test' };
          knowledgeBaseManagerService.createBestPractice.mockResolvedValue(mockResult as any);

          const baseInput = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            source: 'Test Source',
          };

          // Minimum valid (0)
          await expect(useCase.execute({
            ...baseInput,
            confidence: 0,
          })).resolves.toBeDefined();

          // Maximum valid (1)
          await expect(useCase.execute({
            ...baseInput,
            confidence: 1,
          })).resolves.toBeDefined();
        });
      });

      describe('source validation', () => {
        it('should throw when source is missing', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: '',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Source is required'),
          );
        });

        it('should throw when source is too long', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'a'.repeat(201),
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Source must be less than 200 characters'),
          );
        });
      });

      describe('url validation', () => {
        it('should throw when URL is invalid', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
            url: 'not-a-url',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Invalid URL format'),
          );
        });

        it('should throw when URL is too long', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
            url: 'https://example.com/' + 'a'.repeat(480),
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('URL must be less than 500 characters'),
          );
        });

        it('should accept valid URLs', async () => {
          // Arrange
          const mockResult = { id: 'bp-test' };
          knowledgeBaseManagerService.createBestPractice.mockResolvedValue(mockResult as any);

          const validUrls = [
            'https://example.com',
            'http://localhost:3000',
            'https://docs.example.com/path/to/page',
            'https://example.com/page?param=value',
          ];

          for (const url of validUrls) {
            const input = {
              title: 'Title',
              description: 'Description',
              category: 'methodology',
              tags: ['test'],
              confidence: 0.8,
              source: 'Test Source',
              url,
            };

            // Act & Assert
            await expect(useCase.execute(input)).resolves.toBeDefined();
          }
        });
      });

      describe('optional fields validation', () => {
        it('should throw when industry is too long', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            industry: 'a'.repeat(101),
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Industry must be less than 100 characters'),
          );
        });

        it('should throw when processType is too long', async () => {
          // Arrange
          const input = {
            title: 'Title',
            description: 'Description',
            category: 'methodology',
            processType: 'a'.repeat(101),
            tags: ['test'],
            confidence: 0.8,
            source: 'Test Source',
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Process type must be less than 100 characters'),
          );
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const input = {
          title: 'Title',
          description: 'Description',
          category: 'methodology',
          tags: ['test'],
          confidence: 0.8,
          source: 'Test Source',
        };

        const serviceError = new Error('Database error');
        knowledgeBaseManagerService.createBestPractice.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Database error');
      });
    });

    describe('境界値テスト', () => {
      it('should accept maximum valid lengths', async () => {
        // Arrange
        const mockResult = { id: 'bp-test' };
        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(mockResult as any);

        const input = {
          title: 'a'.repeat(200),
          description: 'a'.repeat(1000),
          category: 'methodology',
          industry: 'a'.repeat(100),
          processType: 'a'.repeat(100),
          tags: Array(20).fill('a'.repeat(50)),
          confidence: 1.0,
          source: 'a'.repeat(200),
          url: 'https://example.com/' + 'a'.repeat(475), // Total < 500
        };

        // Act & Assert
        await expect(useCase.execute(input)).resolves.toBeDefined();
      });

      it('should handle minimal valid input', async () => {
        // Arrange
        const mockResult = { id: 'bp-test' };
        knowledgeBaseManagerService.createBestPractice.mockResolvedValue(mockResult as any);

        const input = {
          title: 'T',
          description: 'D',
          category: 'tool',
          tags: [],
          confidence: 0,
          source: 'S',
        };

        // Act & Assert
        await expect(useCase.execute(input)).resolves.toBeDefined();
      });
    });
  });
});