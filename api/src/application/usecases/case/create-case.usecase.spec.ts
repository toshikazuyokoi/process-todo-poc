import { Test, TestingModule } from '@nestjs/testing';
import { CreateCaseUseCase } from './create-case.usecase';
import { ICaseRepository } from '../../../domain/repositories/case.repository.interface';
import { IProcessTemplateRepository } from '../../../domain/repositories/process-template.repository.interface';
import { IStepInstanceRepository } from '../../../domain/repositories/step-instance.repository.interface';
import { IHolidayRepository } from '../../../domain/repositories/holiday.repository.interface';
import { BusinessDayService } from '../../../domain/services/business-day.service';
import { ReplanDomainService } from '../../../domain/services/replan-domain.service';
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
  let replanDomainService: ReplanDomainService;

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
            findWithStepTemplates: jest.fn(),
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
            findByCountryAndDateRange: jest.fn().mockResolvedValue([]),
          }),
        },
        BusinessDayService,
        ReplanDomainService,
      ],
    }).compile();

    useCase = module.get<CreateCaseUseCase>(CreateCaseUseCase);
    caseRepository = module.get('ICaseRepository');
    processTemplateRepository = module.get('IProcessTemplateRepository');
    stepInstanceRepository = module.get('IStepInstanceRepository');
    holidayRepository = module.get('IHolidayRepository');
    businessDayService = module.get<BusinessDayService>(BusinessDayService);
    replanDomainService = module.get<ReplanDomainService>(ReplanDomainService);
  });

  describe('execute', () => {
    it('should create a case with step instances', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        new Date(),
        new Date()
      );
      mockTemplate['_stepTemplates'] = [
        new StepTemplate(
          1,
          1,
          1,
          'Step 1',
          'goal',
          -10,
          [],
          [],
          new Date(),
          new Date()
        ),
        new StepTemplate(
          2,
          1,
          2,
          'Step 2',
          'goal',
          -5,
          [],
          [1],
          new Date(),
          new Date()
        ),
      ];

      const mockCase = new Case(
        1,
        1,
        'Test Case',
        new Date('2024-12-31'),
        'open',
        1,
        new Date(),
        new Date()
      );

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(mockTemplate);
      (holidayRepository as any).findByDateRange = jest.fn().mockResolvedValue([]);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Case');
      expect(processTemplateRepository.findWithStepTemplates).toHaveBeenCalledWith(1);
      expect(caseRepository.save).toHaveBeenCalled();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 999,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Process template with ID 999 not found');
    });

    it('should handle holidays in date calculation', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case with Holidays',
        processId: 1,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        new Date(),
        new Date()
      );
      mockTemplate['_stepTemplates'] = [
        new StepTemplate(
          1,
          1,
          1,
          'Step 1',
          'goal',
          -10,
          [],
          [],
          new Date(),
          new Date()
        ),
      ];

      const mockHolidays = [
        { getDate: () => new Date('2024-12-25'), getName: () => 'Christmas' },
        { getDate: () => new Date('2024-12-26'), getName: () => 'Boxing Day' },
      ];

      const mockCase = new Case(
        1,
        1,
        'Test Case with Holidays',
        new Date('2024-12-31'),
        'open',
        1,
        new Date(),
        new Date()
      );

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(mockTemplate);
      (holidayRepository as any).findByDateRange = jest.fn().mockResolvedValue(mockHolidays);
      (holidayRepository as any).findByCountryAndDateRange = jest.fn().mockResolvedValue(mockHolidays);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect((holidayRepository as any).findByCountryAndDateRange).toHaveBeenCalled();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalled();
    });

    it('should handle step dependencies correctly', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case with Dependencies',
        processId: 1,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        new Date(),
        new Date()
      );
      mockTemplate['_stepTemplates'] = [
        new StepTemplate(
          1,
          1,
          1,
          'Step 1',
          'goal',
          -15,
          [],
          [],
          new Date(),
          new Date()
        ),
        new StepTemplate(
          2,
          1,
          2,
          'Step 2',
          'prev',
          5,
          [],
          [1],
          new Date(),
          new Date()
        ),
        new StepTemplate(
          3,
          1,
          3,
          'Step 3',
          'prev',
          3,
          [],
          [2],
          new Date(),
          new Date()
        ),
      ];

      const mockCase = new Case(
        1,
        1,
        'Test Case with Dependencies',
        new Date('2024-12-31'),
        'open',
        1,
        new Date(),
        new Date()
      );

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(mockTemplate);
      (holidayRepository as any).findByDateRange = jest.fn().mockResolvedValue([]);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Step 1', templateId: 1 }),
          expect.objectContaining({ name: 'Step 2', templateId: 2 }),
          expect.objectContaining({ name: 'Step 3', templateId: 3 }),
        ])
      );
    });

    it('should set correct initial status for step instances', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Test Template',
        1,
        true,
        new Date(),
        new Date()
      );
      mockTemplate['_stepTemplates'] = [
        new StepTemplate(
          1,
          1,
          1,
          'Step 1',
          'goal',
          -10,
          [],
          [],
          new Date(),
          new Date()
        ),
      ];

      const mockCase = new Case(
        1,
        1,
        'Test Case',
        new Date('2024-12-31'),
        'open',
        1,
        new Date(),
        new Date()
      );

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(mockTemplate);
      (holidayRepository as any).findByDateRange = jest.fn().mockResolvedValue([]);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockImplementation((steps) => {
        expect(steps[0].getStatus().getValue()).toBe('todo');
        return Promise.resolve(steps);
      });

      // Act
      await useCase.execute(dto);

      // Assert
      expect(stepInstanceRepository.saveMany).toHaveBeenCalled();
    });

    // TODO: Implement goal date validation in CreateCaseUseCase
    // it('should validate goal date is in the future', async () => {
    //   // Arrange
    //   const pastDate = new Date();
    //   pastDate.setDate(pastDate.getDate() - 1);

    //   const dto: CreateCaseDto = {
    //     title: 'Test Case',
    //     processId: 1,
    //     goalDateUtc: pastDate.toISOString(),
    //   };

    //   // Act & Assert
    //   await expect(useCase.execute(dto)).rejects.toThrow('Goal date must be in the future');
    // });

    it('should handle empty step templates', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Empty Template',
        1,
        true,
        new Date(),
        new Date()
      );
      mockTemplate['_stepTemplates'] = [];

      const mockCase = new Case(
        1,
        1,
        'Test Case',
        new Date('2024-12-31'),
        'open',
        1,
        new Date(),
        new Date()
      );

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(mockTemplate);
      caseRepository.save.mockResolvedValue(mockCase);
      stepInstanceRepository.saveMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(stepInstanceRepository.saveMany).toHaveBeenCalledWith([]);
    });

    it('should handle inactive templates', async () => {
      // Arrange
      const dto: CreateCaseDto = {
        title: 'Test Case',
        processId: 1,
        goalDateUtc: '2024-12-31T00:00:00Z',
      };

      const mockTemplate = new ProcessTemplate(
        1,
        'Inactive Template',
        1,
        false, // inactive
        new Date(),
        new Date()
      );

      processTemplateRepository.findWithStepTemplates.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Process template with ID 1 is not active');
    });
  });
});