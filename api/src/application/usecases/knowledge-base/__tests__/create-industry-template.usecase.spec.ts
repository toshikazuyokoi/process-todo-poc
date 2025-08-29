import { Test, TestingModule } from '@nestjs/testing';
import { CreateIndustryTemplateUseCase } from '../create-industry-template.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('CreateIndustryTemplateUseCase', () => {
  let useCase: CreateIndustryTemplateUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateIndustryTemplateUseCase,
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

    useCase = module.get<CreateIndustryTemplateUseCase>(CreateIndustryTemplateUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should create an industry template successfully', async () => {
        // Arrange
        const input = {
          name: 'Healthcare Industry',
          commonProcesses: ['Patient Registration', 'Diagnosis', 'Treatment'],
          typicalStakeholders: ['Doctor', 'Nurse', 'Administrator', 'Patient'],
          regulatoryRequirements: ['HIPAA', 'GDPR', 'FDA Regulations'],
          standardDurations: {
            consultation: 30,
            diagnosis: 60,
            treatment: 120,
          },
        };

        const expectedResult = TestDataFactory.createMockIndustryTemplate({
          id: 'ind-123',
          name: input.name,
          commonProcesses: input.commonProcesses,
          typicalStakeholders: input.typicalStakeholders,
          regulatoryRequirements: input.regulatoryRequirements,
          standardDurations: input.standardDurations,
        });

        knowledgeBaseManagerService.createIndustryTemplate.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.createIndustryTemplate).toHaveBeenCalledWith({
          name: input.name,
          commonProcesses: input.commonProcesses,
          typicalStakeholders: input.typicalStakeholders,
          regulatoryRequirements: input.regulatoryRequirements,
          standardDurations: input.standardDurations,
        });
      });

      it('should create template without optional standardDurations', async () => {
        // Arrange
        const input = {
          name: 'Simple Industry',
          commonProcesses: ['Process 1'],
          typicalStakeholders: ['Stakeholder 1'],
          regulatoryRequirements: [],
        };

        const expectedResult = TestDataFactory.createMockIndustryTemplate({
          id: 'ind-124',
          name: input.name,
          standardDurations: {},
        });

        knowledgeBaseManagerService.createIndustryTemplate.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
        expect(knowledgeBaseManagerService.createIndustryTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: input.name,
            standardDurations: undefined,
          }),
        );
      });

      it('should handle maximum allowed array sizes', async () => {
        // Arrange
        const input = {
          name: 'Complex Industry',
          commonProcesses: Array(50).fill('Process'),
          typicalStakeholders: Array(30).fill('Stakeholder'),
          regulatoryRequirements: Array(50).fill('Regulation'),
        };

        const expectedResult = TestDataFactory.createMockIndustryTemplate();
        knowledgeBaseManagerService.createIndustryTemplate.mockResolvedValue(expectedResult);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual(expectedResult);
      });
    });

    describe('異常系', () => {
      describe('name validation', () => {
        it('should throw when name is missing', async () => {
          // Arrange
          const input = {
            name: '',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Industry template name is required'),
          );
        });

        it('should throw when name is too long', async () => {
          // Arrange
          const input = {
            name: 'a'.repeat(101),
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Industry template name must be less than 100 characters'),
          );
        });
      });

      describe('commonProcesses validation', () => {
        it('should throw when commonProcesses is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: 'not an array' as any,
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Common processes must be an array'),
          );
        });

        it('should throw when commonProcesses is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: [],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('At least one common process is required'),
          );
        });

        it('should throw when commonProcesses exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: Array(51).fill('Process'),
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 50 common processes'),
          );
        });

        it('should throw when a common process is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Valid Process', ''],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Common process cannot be empty'),
          );
        });

        it('should throw when a common process is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['a'.repeat(201)],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Common process must be less than 200 characters'),
          );
        });
      });

      describe('typicalStakeholders validation', () => {
        it('should throw when typicalStakeholders is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: 'not an array' as any,
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Typical stakeholders must be an array'),
          );
        });

        it('should throw when typicalStakeholders is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: [],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('At least one typical stakeholder is required'),
          );
        });

        it('should throw when typicalStakeholders exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: Array(31).fill('Stakeholder'),
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 30 typical stakeholders'),
          );
        });

        it('should throw when a stakeholder is empty', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Valid Stakeholder', ''],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Typical stakeholder cannot be empty'),
          );
        });

        it('should throw when a stakeholder is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['a'.repeat(101)],
            regulatoryRequirements: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Typical stakeholder must be less than 100 characters'),
          );
        });
      });

      describe('regulatoryRequirements validation', () => {
        it('should throw when regulatoryRequirements is not an array', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: 'not an array' as any,
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Regulatory requirements must be an array'),
          );
        });

        it('should throw when regulatoryRequirements exceeds limit', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: Array(51).fill('Regulation'),
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 50 regulatory requirements'),
          );
        });

        it('should throw when a regulatory requirement is too long', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: ['a'.repeat(201)],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Regulatory requirement must be less than 200 characters'),
          );
        });

        it('should allow empty regulatory requirements array', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
          };

          const expectedResult = TestDataFactory.createMockIndustryTemplate();
          knowledgeBaseManagerService.createIndustryTemplate.mockResolvedValue(expectedResult);

          // Act & Assert - should not throw
          await expect(useCase.execute(input)).resolves.toEqual(expectedResult);
        });
      });

      describe('standardDurations validation', () => {
        it('should throw when standardDurations is not an object', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
            standardDurations: 'not an object' as any,
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Standard durations must be an object'),
          );
        });

        it('should throw when standardDurations has too many keys', async () => {
          // Arrange
          const durations: Record<string, number> = {};
          for (let i = 0; i < 101; i++) {
            durations[`process${i}`] = 10;
          }

          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
            standardDurations: durations,
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot have more than 100 standard durations'),
          );
        });

        it('should throw when duration value is not a number', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
            standardDurations: {
              process1: 'not a number' as any,
            },
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Standard duration must be a number between 0 and 10000'),
          );
        });

        it('should throw when duration value is negative', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
            standardDurations: {
              process1: -1,
            },
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Standard duration must be a number between 0 and 10000'),
          );
        });

        it('should throw when duration value exceeds maximum', async () => {
          // Arrange
          const input = {
            name: 'Test Industry',
            commonProcesses: ['Process'],
            typicalStakeholders: ['Stakeholder'],
            regulatoryRequirements: [],
            standardDurations: {
              process1: 10001,
            },
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Standard duration must be a number between 0 and 10000'),
          );
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const input = {
          name: 'Test Industry',
          commonProcesses: ['Process'],
          typicalStakeholders: ['Stakeholder'],
          regulatoryRequirements: [],
        };

        const serviceError = new Error('Database error');
        knowledgeBaseManagerService.createIndustryTemplate.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Database error');
      });
    });
  });
});