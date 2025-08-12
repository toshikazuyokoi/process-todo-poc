import { Test, TestingModule } from '@nestjs/testing';
import { CreateCaseUseCase } from './create-case.usecase';
import { ICaseRepository } from '../../../domain/repositories/case.repository.interface';
import { IProcessTemplateRepository } from '../../../domain/repositories/process-template.repository.interface';
import { IStepInstanceRepository } from '../../../domain/repositories/step-instance.repository.interface';
import { IHolidayRepository } from '../../../domain/repositories/holiday.repository.interface';
import { BusinessDayService } from '../../../domain/services/business-day.service';
import { CreateCaseDto } from '../../dto/case/create-case.dto';
import { Case } from '../../../domain/entities/case';
import { ProcessTemplate } from '../../../domain/entities/process-template';
import { StepTemplate } from '../../../domain/entities/step-template';

describe('CreateCaseUseCase', () => {
  let useCase: CreateCaseUseCase;
  let caseRepository: jest.Mocked<ICaseRepository>;
  let processTemplateRepository: jest.Mocked<IProcessTemplateRepository>;
  let stepInstanceRepository: jest.Mocked<IStepInstanceRepository>;
  let holidayRepository: jest.Mocked<IHolidayRepository>;
  let businessDayService: BusinessDayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCaseUseCase,
        {
          provide: 'ICaseRepository',
          useFactory: () => ({
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          }),
        },
        {
          provide: 'IProcessTemplateRepository',
          useFactory: () => ({
            findById: jest.fn(),
            save: jest.fn(),
            findAll: jest.fn(),
            findByName: jest.fn(),
          }),
        },
        {
          provide: 'IStepInstanceRepository',
          useFactory: () => ({
            saveMany: jest.fn(),
            findByCaseId: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: 'IHolidayRepository',
          useFactory: () => ({
            findByDateRange: jest.fn(),
          }),
        },
        BusinessDayService,
      ],
    }).compile();

    useCase = module.get<CreateCaseUseCase>(CreateCaseUseCase);
    caseRepository = module.get('ICaseRepository');
    processTemplateRepository = module.get('IProcessTemplateRepository');
    stepInstanceRepository = module.get('IStepInstanceRepository');
    holidayRepository = module.get('IHolidayRepository');
    businessDayService = module.get<BusinessDayService>(BusinessDayService);
  });

  describe('execute', () => {
    it('should create a case with step instances', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: new Date('2024-12-31'),
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        [
          new StepTemplate(
            1,
            1,
            1,
            'Step 1',
            'goal',
            -10,
            [],
            []
          ),
          new StepTemplate(
            2,
            1,
            2,
            'Step 2',
            'goal',
            -5,
            [],
            [1]
          ),
        ]
      );

      const mockCase = new Case(
        1,
        'Test Case',
        1,
        new Date('2024-12-31'),
        'OPEN',
        1,
        new Date(),
        new Date(),
        []
      );

      processTemplateRepository.findById.mockResolvedValue(mockTemplate);
      holidayRepository.findByDateRange.mockResolvedValue([]);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Case');
      expect(processTemplateRepository.findById).toHaveBeenCalledWith(1);
      expect(caseRepository.save).toHaveBeenCalled();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 999,
        goalDateUtc: new Date('2024-12-31'),
      };

      processTemplateRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Process template not found');
    });

    it('should handle holidays in date calculation', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case with Holidays',
        processId: 1,
        goalDateUtc: new Date('2024-12-31'),
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        [
          new StepTemplate(
            1,
            1,
            1,
            'Step 1',
            'goal',
            -10,
            [],
            []
          ),
        ]
      );

      const mockHolidays = [
        { date: new Date('2024-12-25'), name: 'Christmas' },
        { date: new Date('2024-12-26'), name: 'Boxing Day' },
      ];

      const mockCase = new Case(
        1,
        'Test Case with Holidays',
        1,
        new Date('2024-12-31'),
        'OPEN',
        1,
        new Date(),
        new Date(),
        []
      );

      processTemplateRepository.findById.mockResolvedValue(mockTemplate);
      holidayRepository.findByDateRange.mockResolvedValue(mockHolidays);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(holidayRepository.findByDateRange).toHaveBeenCalled();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalled();
    });

    it('should handle step dependencies correctly', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case with Dependencies',
        processId: 1,
        goalDateUtc: new Date('2024-12-31'),
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        [
          new StepTemplate(
            1,
            1,
            1,
            'Step 1',
            'goal',
            -15,
            [],
            []
          ),
          new StepTemplate(
            2,
            1,
            2,
            'Step 2',
            'prev',
            5,
            [],
            [1]
          ),
          new StepTemplate(
            3,
            1,
            3,
            'Step 3',
            'prev',
            3,
            [],
            [2]
          ),
        ]
      );

      const mockCase = new Case(
        1,
        'Test Case with Dependencies',
        1,
        new Date('2024-12-31'),
        'OPEN',
        1,
        new Date(),
        new Date(),
        []
      );

      processTemplateRepository.findById.mockResolvedValue(mockTemplate);
      holidayRepository.findByDateRange.mockResolvedValue([]);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ seq: 1 }),
          expect.objectContaining({ seq: 2 }),
          expect.objectContaining({ seq: 3 }),
        ])
      );
    });

    it('should set correct initial status for step instances', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: new Date('2024-12-31'),
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        [
          new StepTemplate(
            1,
            1,
            1,
            'Step 1',
            'goal',
            -10,
            [],
            []
          ),
        ]
      );

      const mockCase = new Case(
        1,
        'Test Case',
        1,
        new Date('2024-12-31'),
        'OPEN',
        1,
        new Date(),
        new Date(),
        []
      );

      processTemplateRepository.findById.mockResolvedValue(mockTemplate);
      holidayRepository.findByDateRange.mockResolvedValue([]);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockImplementation((steps) => {
        expect(steps[0].status).toBe('todo');
        return Promise.resolve(steps);
      });

      // Act
      await useCase.execute(dto);

      // Assert
      expect(stepInstanceRepository.saveMany).toHaveBeenCalled();
    });

    it('should validate goal date is in the future', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: pastDate,
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Goal date must be in the future');
    });

    it('should handle empty step templates', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: new Date('2024-12-31'),
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Empty Template',
        1,
        true,
        []
      );

      const mockCase = new Case(
        1,
        'Test Case',
        1,
        new Date('2024-12-31'),
        'OPEN',
        1,
        new Date(),
        new Date(),
        []
      );

      processTemplateRepository.findById.mockResolvedValue(mockTemplate);
      caseRepository.save.mockResolvedValue(mockCase);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(stepInstanceRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should handle inactive templates', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: new Date('2024-12-31'),
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Inactive Template',
        1,
        false, // inactive
        []
      );

      processTemplateRepository.findById.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Process template is not active');
    });
  });
});