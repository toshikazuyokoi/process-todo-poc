import { Test, TestingModule } from '@nestjs/testing';
import { StepController } from './step.controller';
import { StepInstanceRepository } from '@infrastructure/repositories/step-instance.repository';
import { BulkUpdateStepsDto } from '@application/dto/step/bulk-update-steps.dto';

describe('StepController - Bulk Operations', () => {
  let controller: StepController;
  let stepRepository: StepInstanceRepository;

  const mockStep = {
    getId: () => 1,
    getCaseId: () => 1,
    getTemplateId: () => 1,
    getName: () => 'Test Step',
    getDueDate: () => ({ getDate: () => new Date() }),
    getAssigneeId: () => null,
    getStatus: () => ({ toString: () => 'pending' }),
    isLocked: () => false,
    getCreatedAt: () => new Date(),
    getUpdatedAt: () => new Date(),
    isOverdue: () => false,
    getDaysUntilDue: () => 5,
    updateStatus: jest.fn(),
    assignTo: jest.fn(),
    lock: jest.fn(),
    unlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StepController],
      providers: [
        {
          provide: StepInstanceRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StepController>(StepController);
    stepRepository = module.get<StepInstanceRepository>(StepInstanceRepository);
    
    // Reset mock functions
    jest.clearAllMocks();
  });

  describe('bulkUpdate', () => {
    it('should update multiple steps successfully', async () => {
      const dto: BulkUpdateStepsDto = {
        stepIds: [1, 2, 3],
        status: 'completed',
        assigneeId: 5,
        locked: true,
      };

      jest.spyOn(stepRepository, 'findById')
        .mockResolvedValueOnce(mockStep as any)
        .mockResolvedValueOnce(mockStep as any)
        .mockResolvedValueOnce(mockStep as any);
      
      jest.spyOn(stepRepository, 'update').mockResolvedValue(mockStep as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual({ updated: 3 });
      expect(stepRepository.findById).toHaveBeenCalledTimes(3);
      expect(stepRepository.update).toHaveBeenCalledTimes(3);
      expect(mockStep.updateStatus).toHaveBeenCalledWith('completed');
      expect(mockStep.assignTo).toHaveBeenCalledWith(5);
      expect(mockStep.lock).toHaveBeenCalled();
    });

    it('should skip non-existent steps', async () => {
      const dto: BulkUpdateStepsDto = {
        stepIds: [1, 999, 3],
        status: 'in_progress',
      };

      jest.spyOn(stepRepository, 'findById')
        .mockResolvedValueOnce(mockStep as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockStep as any);
      
      jest.spyOn(stepRepository, 'update').mockResolvedValue(mockStep as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual({ updated: 2 });
      expect(stepRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should unlock steps when locked is false', async () => {
      const dto: BulkUpdateStepsDto = {
        stepIds: [1],
        locked: false,
      };

      const testStep = {
        ...mockStep,
        lock: jest.fn(),
        unlock: jest.fn(),
      };

      jest.spyOn(stepRepository, 'findById').mockResolvedValue(testStep as any);
      jest.spyOn(stepRepository, 'update').mockResolvedValue(testStep as any);

      await controller.bulkUpdate(dto);

      expect(testStep.unlock).toHaveBeenCalled();
      expect(testStep.lock).not.toHaveBeenCalled();
    });

    it('should handle null assigneeId', async () => {
      const dto: BulkUpdateStepsDto = {
        stepIds: [1],
        assigneeId: null,
      };

      jest.spyOn(stepRepository, 'findById').mockResolvedValue(mockStep as any);
      jest.spyOn(stepRepository, 'update').mockResolvedValue(mockStep as any);

      await controller.bulkUpdate(dto);

      expect(mockStep.assignTo).toHaveBeenCalledWith(null);
    });
  });
});