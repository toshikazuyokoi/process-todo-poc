import { Test, TestingModule } from '@nestjs/testing';
import { CreateProcessTypeUseCase } from '../create-process-type.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('CreateProcessTypeUseCase', () => {
  let useCase: CreateProcessTypeUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProcessTypeUseCase,
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

    useCase = module.get<CreateProcessTypeUseCase>(CreateProcessTypeUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should create a process type successfully', async () => {
        // Arrange
        const input = {
          name: 'Agile Development Process',
          category: 'development' as const,
          phases: [
            {
              name: 'Planning',
              description: 'Initial planning and requirement gathering',
              typicalDuration: 40,
              requiredRoles: ['Product Owner', 'Business Analyst'],
              deliverables: ['Requirements Document', 'Project Plan'],
              dependencies: [],
              parallelizable: false,
            },
            {
              name: 'Development',
              description: 'Implementation phase',
              typicalDuration: 160,
              requiredRoles: ['Developer', 'Tech Lead'],
              deliverables: ['Source Code', 'Unit Tests'],
              dependencies: ['Planning'],
              parallelizable: true,
            },
          ],
          commonDeliverables: ['Product Increment', 'Documentation'],
          riskFactors: ['Scope Creep', 'Technical Debt'],
        };

        const expectedResult = TestDataFactory.createMockProcessType({
          id: 'proc-123',
          name: input.name,
          category: input.category,
          phases: input.phases,
          commonDeliverables: input.commonDeliverables,
          riskFactors: input.riskFactors,
        });

        knowledgeBaseManagerService.createProcessType.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.createProcessType).toHaveBeenCalledWith({
          name: input.name,
          category: input.category,
          phases: input.phases,
          commonDeliverables: input.commonDeliverables,
          riskFactors: input.riskFactors,
        });
      });

      it('should create process type without optional risk factors', async () => {
        // Arrange
        const input = {
          name: 'Simple Process',
          category: 'operations' as const,
          phases: [
            {
              name: 'Execute',
              description: 'Execute the process',
              typicalDuration: 8,
              requiredRoles: ['Operator'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            },
          ],
          commonDeliverables: ['Result'],
        };

        const expectedResult = TestDataFactory.createMockProcessType();
        knowledgeBaseManagerService.createProcessType.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.createProcessType).toHaveBeenCalledWith(
          expect.objectContaining({
            riskFactors: undefined,
          }),
        );
      });

      it('should handle all valid process categories', async () => {
        // Arrange
        const validCategories = [
          'development', 'marketing', 'sales', 'operations',
          'hr', 'finance', 'legal', 'procurement',
          'manufacturing', 'quality_assurance', 'customer_service', 'research',
        ];

        for (const category of validCategories) {
          const input = {
            name: `Test Process for ${category}`,
            category: category as any,
            phases: [
              {
                name: 'Test Phase',
                description: 'Test',
                typicalDuration: 8,
                requiredRoles: ['Role'],
                deliverables: ['Deliverable'],
                dependencies: [],
                parallelizable: false,
              },
            ],
            commonDeliverables: ['Output'],
          };

          const expectedResult = TestDataFactory.createMockProcessType();
          knowledgeBaseManagerService.createProcessType.mockResolvedValue(expectedResult);

          // Act & Assert - should not throw
          await expect(useCase.execute(input)).resolves.toBeDefined();
        }
      });
    });

    describe('異常系', () => {
      describe('name validation', () => {
        it('should throw when name is missing', async () => {
          // Arrange
          const input = {
            name: '',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Process type name is required'),
          );
        });

        it('should throw when name is too long', async () => {
          // Arrange
          const input = {
            name: 'a'.repeat(101),
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Process type name must be less than 100 characters'),
          );
        });
      });

      describe('category validation', () => {
        it('should throw when category is missing', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: '' as any,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Process category is required'),
          );
        });

        it('should throw when category is invalid', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'invalid-category' as any,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Invalid process category'),
          );
        });
      });

      describe('phases validation', () => {
        it('should throw when phases is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: 'not-an-array' as any,
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Process phases must be an array'),
          );
        });

        it('should throw when phases is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('At least one phase is required'),
          );
        });

        it('should throw when phases exceeds limit', async () => {
          // Arrange
          const phases = Array(21).fill({
            name: 'Phase',
            description: 'Desc',
            typicalDuration: 8,
            requiredRoles: ['Role'],
            deliverables: ['Output'],
            dependencies: [],
            parallelizable: false,
          });

          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases,
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 20 phases'),
          );
        });

        it('should throw when phase has duplicate names', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [
              {
                name: 'Duplicate',
                description: 'First',
                typicalDuration: 8,
                requiredRoles: ['Role'],
                deliverables: ['Output'],
                dependencies: [],
                parallelizable: false,
              },
              {
                name: 'Duplicate',
                description: 'Second',
                typicalDuration: 8,
                requiredRoles: ['Role'],
                deliverables: ['Output'],
                dependencies: [],
                parallelizable: false,
              },
            ],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase names must be unique'),
          );
        });
      });

      describe('phase field validation', () => {
        it('should throw when phase name is missing', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: '',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase name is required'),
          );
        });

        it('should throw when phase name is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'a'.repeat(101),
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase name must be less than 100 characters'),
          );
        });

        it('should throw when phase description is missing', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: '',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase description is required'),
          );
        });

        it('should throw when phase description is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'a'.repeat(501),
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase description must be less than 500 characters'),
          );
        });

        it('should throw when typical duration is not a number', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 'not-a-number' as any,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase typical duration must be a number'),
          );
        });

        it('should throw when typical duration is out of range', async () => {
          // Arrange
          const invalidDurations = [0, 2001];

          for (const duration of invalidDurations) {
            const input = {
              name: 'Test Process',
              category: 'development' as const,
              phases: [{
                name: 'Phase',
                description: 'Desc',
                typicalDuration: duration,
                requiredRoles: ['Role'],
                deliverables: ['Output'],
                dependencies: [],
                parallelizable: false,
              }],
              commonDeliverables: ['Output'],
            };

            // Act & Assert
            await expect(useCase.execute(input)).rejects.toThrow(
              new DomainException('Phase typical duration must be between 1 and 2000 hours'),
            );
          }
        });

        it('should throw when required roles is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: 'not-an-array' as any,
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase required roles must be an array'),
          );
        });

        it('should throw when required roles exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: Array(21).fill('Role'),
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase cannot have more than 20 required roles'),
          );
        });

        it('should throw when a required role is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Valid Role', ''],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Required role cannot be empty'),
          );
        });

        it('should throw when a required role is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['a'.repeat(101)],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Required role must be less than 100 characters'),
          );
        });

        it('should throw when deliverables is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: 'not-an-array' as any,
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase deliverables must be an array'),
          );
        });

        it('should throw when deliverables exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: Array(21).fill('Deliverable'),
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase cannot have more than 20 deliverables'),
          );
        });

        it('should throw when a deliverable is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: [''],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase deliverable cannot be empty'),
          );
        });

        it('should throw when a deliverable is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['a'.repeat(201)],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase deliverable must be less than 200 characters'),
          );
        });

        it('should throw when dependencies is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: 'not-an-array' as any,
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase dependencies must be an array'),
          );
        });

        it('should throw when dependencies exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: Array(11).fill('Dependency'),
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase cannot have more than 10 dependencies'),
          );
        });

        it('should throw when parallelizable is not a boolean', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: 'not-a-boolean' as any,
            }],
            commonDeliverables: ['Output'],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Phase parallelizable must be a boolean'),
          );
        });
      });

      describe('commonDeliverables validation', () => {
        it('should throw when commonDeliverables is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: 'not-an-array' as any,
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Common deliverables must be an array'),
          );
        });

        it('should throw when commonDeliverables is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('At least one common deliverable is required'),
          );
        });

        it('should throw when commonDeliverables exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: Array(51).fill('Deliverable'),
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 50 common deliverables'),
          );
        });
      });

      describe('riskFactors validation', () => {
        it('should throw when riskFactors is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
            riskFactors: 'not-an-array' as any,
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Risk factors must be an array'),
          );
        });

        it('should throw when riskFactors exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
            riskFactors: Array(31).fill('Risk'),
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 30 risk factors'),
          );
        });

        it('should allow empty risk factors array', async () => {
          // Arrange
          const input = {
            name: 'Test Process',
            category: 'development' as const,
            phases: [{
              name: 'Phase',
              description: 'Desc',
              typicalDuration: 8,
              requiredRoles: ['Role'],
              deliverables: ['Output'],
              dependencies: [],
              parallelizable: false,
            }],
            commonDeliverables: ['Output'],
            riskFactors: [],
          };

          const expectedResult = TestDataFactory.createMockProcessType();
          knowledgeBaseManagerService.createProcessType.mockResolvedValue(expectedResult);

          // Act & Assert - should not throw
          await expect(useCase.execute(input)).resolves.toEqual(expectedResult);
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const input = {
          name: 'Test Process',
          category: 'development' as const,
          phases: [{
            name: 'Phase',
            description: 'Desc',
            typicalDuration: 8,
            requiredRoles: ['Role'],
            deliverables: ['Output'],
            dependencies: [],
            parallelizable: false,
          }],
          commonDeliverables: ['Output'],
        };

        const serviceError = new Error('Database error');
        knowledgeBaseManagerService.createProcessType.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Database error');
      });
    });
  });
});