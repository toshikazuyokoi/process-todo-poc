import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProcessTypeUseCase } from '../update-process-type.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('UpdateProcessTypeUseCase', () => {
  let useCase: UpdateProcessTypeUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProcessTypeUseCase,
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

    useCase = module.get<UpdateProcessTypeUseCase>(UpdateProcessTypeUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should update a process type successfully with all fields', async () => {
        // Arrange
        const id = 'proc-001';
        const input = {
          name: 'Updated Agile Development',
          category: 'management' as const,
          description: 'Updated description of agile methodology',
          phases: [
            {
              name: 'Updated Sprint Planning',
              description: 'Plan the upcoming sprint',
              typicalDuration: 3,
              requiredRoles: ['Product Owner', 'Scrum Master'],
              deliverables: ['Sprint Backlog'],
              dependencies: [],
              parallelizable: false,
            },
          ],
          applicableIndustries: ['software', 'consulting'],
          typicalDeliverables: ['Product Increment'],
          estimatedDuration: 160,
          requiredSkills: ['Scrum', 'Jira'],
        };

        const expectedResult = TestDataFactory.createMockProcessType({
          id,
          name: input.name,
          category: input.category,
          description: input.description,
          phases: input.phases,
          applicableIndustries: input.applicableIndustries,
          typicalDeliverables: input.typicalDeliverables,
          estimatedDuration: input.estimatedDuration,
          requiredSkills: input.requiredSkills,
        });

        knowledgeBaseManagerService.updateProcessType.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.updateProcessType).toHaveBeenCalledWith(id, {
          name: input.name,
          category: input.category,
          description: input.description,
          phases: input.phases,
          applicableIndustries: input.applicableIndustries,
          typicalDeliverables: input.typicalDeliverables,
          estimatedDuration: input.estimatedDuration,
          requiredSkills: input.requiredSkills,
        });
      });

      it('should update process type with partial fields', async () => {
        // Arrange
        const id = 'proc-002';
        const input = {
          name: 'Updated Name Only',
          estimatedDuration: 200,
        };

        const expectedResult = TestDataFactory.createMockProcessType({
          id,
          name: input.name,
          estimatedDuration: input.estimatedDuration,
        });

        knowledgeBaseManagerService.updateProcessType.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.updateProcessType).toHaveBeenCalledWith(id, {
          name: input.name,
          estimatedDuration: input.estimatedDuration,
        });
      });

      it('should update only description without other fields', async () => {
        // Arrange
        const id = 'proc-003';
        const input = {
          description: 'New detailed description',
        };

        const expectedResult = TestDataFactory.createMockProcessType({
          id,
          description: input.description,
        });

        knowledgeBaseManagerService.updateProcessType.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(id, input);

        // Assert
        expect(result).toEqual(expectedResult);
      });

      it('should handle maximum allowed arrays', async () => {
        // Arrange
        const id = 'proc-004';
        const input = {
          phases: Array(20).fill(0).map((_, i) => ({
            name: `Phase ${i}`,
            description: 'Description',
            typicalDuration: 10,
            requiredRoles: ['Role'],
            deliverables: ['Deliverable'],
            dependencies: [],
            parallelizable: false,
          })),
          applicableIndustries: Array(20).fill('industry'),
          typicalDeliverables: Array(50).fill('deliverable'),
          requiredSkills: Array(30).fill('skill'),
        };

        const expectedResult = TestDataFactory.createMockProcessType();
        knowledgeBaseManagerService.updateProcessType.mockResolvedValue(expectedResult);

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
          const input = { name: 'Test' };

          // Act & Assert
          await expect(useCase.execute('', input)).rejects.toThrow(
            new DomainException('Process type ID is required'),
          );
        });

        it('should throw when ID format is invalid', async () => {
          // Arrange
          const input = { name: 'Test' };

          // Act & Assert
          await expect(useCase.execute('invalid-format', input)).rejects.toThrow(
            new DomainException('Invalid process type ID format'),
          );
        });
      });

      describe('Updates validation', () => {
        it('should throw when no update fields are provided', async () => {
          // Arrange
          const id = 'proc-001';
          const input = {};

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('At least one field must be provided for update'),
          );
        });

        it('should throw when updates is not an object', async () => {
          // Arrange
          const id = 'proc-001';
          const input = 'not-an-object' as any;

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Updates must be an object'),
          );
        });
      });

      describe('name validation', () => {
        it('should throw when name is empty', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { name: '' };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Process type name cannot be empty'),
          );
        });

        it('should throw when name is too long', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { name: 'a'.repeat(101) };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Process type name must be less than 100 characters'),
          );
        });
      });

      describe('category validation', () => {
        it('should throw when category is invalid', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { category: 'invalid-category' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Invalid process type category'),
          );
        });
      });

      describe('description validation', () => {
        it('should throw when description is too long', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { description: 'a'.repeat(1001) };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Process type description must be less than 1000 characters'),
          );
        });
      });

      describe('phases validation', () => {
        it('should throw when phases is not an array', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { phases: 'not-an-array' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Phases must be an array'),
          );
        });

        it('should throw when phases exceeds limit', async () => {
          // Arrange
          const id = 'proc-001';
          const phases = Array(21).fill({
            name: 'Phase',
            description: 'Description',
            typicalDuration: 10,
            requiredRoles: ['Role'],
            deliverables: ['Deliverable'],
            dependencies: [],
            parallelizable: false,
          });
          const input = { phases };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 20 phases'),
          );
        });

        it('should throw when phase name is missing', async () => {
          // Arrange
          const id = 'proc-001';
          const input = {
            phases: [
              {
                name: '',
                description: 'Description',
                typicalDuration: 10,
                requiredRoles: ['Role'],
                deliverables: ['Deliverable'],
                dependencies: [],
                parallelizable: false,
              },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Phase name is required'),
          );
        });

        it('should throw when phase name is too long', async () => {
          // Arrange
          const id = 'proc-001';
          const input = {
            phases: [
              {
                name: 'a'.repeat(101),
                description: 'Description',
                typicalDuration: 10,
                requiredRoles: ['Role'],
                deliverables: ['Deliverable'],
                dependencies: [],
                parallelizable: false,
              },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Phase name must be less than 100 characters'),
          );
        });

        it('should throw when phase has duplicate names', async () => {
          // Arrange
          const id = 'proc-001';
          const input = {
            phases: [
              {
                name: 'Duplicate Phase',
                description: 'First',
                typicalDuration: 10,
                requiredRoles: ['Role'],
                deliverables: ['Deliverable'],
                dependencies: [],
                parallelizable: false,
              },
              {
                name: 'Duplicate Phase',
                description: 'Second',
                typicalDuration: 20,
                requiredRoles: ['Role'],
                deliverables: ['Deliverable'],
                dependencies: [],
                parallelizable: false,
              },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Phase names must be unique'),
          );
        });

        it('should throw when phase duration is invalid', async () => {
          // Arrange
          const id = 'proc-001';
          const invalidDurations = [0, 2001, -1];

          for (const duration of invalidDurations) {
            const input = {
              phases: [
                {
                  name: 'Phase',
                  description: 'Description',
                  typicalDuration: duration,
                  requiredRoles: ['Role'],
                  deliverables: ['Deliverable'],
                  dependencies: [],
                  parallelizable: false,
                },
              ],
            };

            // Act & Assert
            await expect(useCase.execute(id, input)).rejects.toThrow(
              new DomainException('Phase typical duration must be between 1 and 2000 hours'),
            );
          }
        });
      });

      describe('applicableIndustries validation', () => {
        it('should throw when applicableIndustries is not an array', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { applicableIndustries: 'not-an-array' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Applicable industries must be an array'),
          );
        });

        it('should throw when applicableIndustries exceeds limit', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { applicableIndustries: Array(21).fill('industry') };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 20 applicable industries'),
          );
        });

        it('should throw when an industry is empty', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { applicableIndustries: ['valid', ''] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Applicable industry cannot be empty'),
          );
        });
      });

      describe('typicalDeliverables validation', () => {
        it('should throw when typicalDeliverables exceeds limit', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { typicalDeliverables: Array(51).fill('deliverable') };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 50 typical deliverables'),
          );
        });

        it('should throw when a deliverable is too long', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { typicalDeliverables: ['a'.repeat(201)] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Typical deliverable must be less than 200 characters'),
          );
        });
      });

      describe('estimatedDuration validation', () => {
        it('should throw when estimatedDuration is out of range', async () => {
          // Arrange
          const id = 'proc-001';
          const invalidDurations = [0, 10001, -1];

          for (const duration of invalidDurations) {
            const input = { estimatedDuration: duration };

            // Act & Assert
            await expect(useCase.execute(id, input)).rejects.toThrow(
              new DomainException('Estimated duration must be between 1 and 10000 hours'),
            );
          }
        });

        it('should throw when estimatedDuration is not a number', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { estimatedDuration: 'not-a-number' as any };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Estimated duration must be a number'),
          );
        });
      });

      describe('requiredSkills validation', () => {
        it('should throw when requiredSkills exceeds limit', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { requiredSkills: Array(31).fill('skill') };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Cannot have more than 30 required skills'),
          );
        });

        it('should throw when a skill is too long', async () => {
          // Arrange
          const id = 'proc-001';
          const input = { requiredSkills: ['a'.repeat(51)] };

          // Act & Assert
          await expect(useCase.execute(id, input)).rejects.toThrow(
            new DomainException('Required skill must be less than 50 characters'),
          );
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const id = 'proc-001';
        const input = { name: 'Test' };
        const serviceError = new Error('Database error');
        knowledgeBaseManagerService.updateProcessType.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(id, input)).rejects.toThrow('Database error');
      });
    });

    describe('境界値テスト', () => {
      it('should accept maximum valid lengths', async () => {
        // Arrange
        const id = 'proc-001';
        const mockResult = TestDataFactory.createMockProcessType();
        knowledgeBaseManagerService.updateProcessType.mockResolvedValue(mockResult);

        // Name at max length
        await expect(useCase.execute(id, {
          name: 'a'.repeat(100),
        })).resolves.toBeDefined();

        // Description at max length
        await expect(useCase.execute(id, {
          description: 'a'.repeat(1000),
        })).resolves.toBeDefined();
      });

      it('should accept duration at boundaries', async () => {
        // Arrange
        const id = 'proc-001';
        const mockResult = TestDataFactory.createMockProcessType();
        knowledgeBaseManagerService.updateProcessType.mockResolvedValue(mockResult);

        // Minimum valid
        await expect(useCase.execute(id, {
          estimatedDuration: 1,
        })).resolves.toBeDefined();

        // Maximum valid
        await expect(useCase.execute(id, {
          estimatedDuration: 10000,
        })).resolves.toBeDefined();
      });
    });
  });
});