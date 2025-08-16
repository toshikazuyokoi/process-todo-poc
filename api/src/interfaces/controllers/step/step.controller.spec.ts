import { Test, TestingModule } from '@nestjs/testing';
import { StepController } from './step.controller';
import { GetStepByIdUseCase } from '@application/usecases/step/get-step-by-id.usecase';
import { UpdateStepStatusUseCase } from '@application/usecases/step/update-step-status.usecase';
import { AssignStepToUserUseCase } from '@application/usecases/step/assign-step-to-user.usecase';
import { LockStepUseCase } from '@application/usecases/step/lock-step.usecase';
import { UnlockStepUseCase } from '@application/usecases/step/unlock-step.usecase';
import { BulkUpdateStepsUseCase } from '@application/usecases/step/bulk-update-steps.usecase';
import { BulkUpdateStepsDto } from '@application/dto/step/bulk-update-steps.dto';
import { StepStatusEnum } from '@application/dto/step/update-step-status.dto';

describe('StepController - Bulk Operations', () => {
  let controller: StepController;
  let bulkUpdateStepsUseCase: BulkUpdateStepsUseCase;

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
          provide: GetStepByIdUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateStepStatusUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AssignStepToUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: LockStepUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UnlockStepUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: BulkUpdateStepsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<StepController>(StepController);
    bulkUpdateStepsUseCase = module.get<BulkUpdateStepsUseCase>(BulkUpdateStepsUseCase);
    
    // Reset mock functions
    jest.clearAllMocks();
  });

  describe('bulkUpdate', () => {
    it('should update multiple steps successfully', async () => {
      const dto: BulkUpdateStepsDto = {
        updates: [
          { stepId: 1, status: StepStatusEnum.DONE, assigneeId: 5, locked: true },
          { stepId: 2, status: StepStatusEnum.DONE, assigneeId: 5, locked: true },
          { stepId: 3, status: StepStatusEnum.DONE, assigneeId: 5, locked: true },
        ],
        userId: 1,
      };

      const mockResults = [
        { ...mockStep, status: 'done' },
        { ...mockStep, status: 'done' },
        { ...mockStep, status: 'done' },
      ];

      jest.spyOn(bulkUpdateStepsUseCase, 'execute').mockResolvedValue(mockResults as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual(mockResults);
      expect(bulkUpdateStepsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(bulkUpdateStepsUseCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should skip non-existent steps', async () => {
      const dto: BulkUpdateStepsDto = {
        updates: [
          { stepId: 1, status: StepStatusEnum.IN_PROGRESS },
          { stepId: 999, status: StepStatusEnum.IN_PROGRESS },
          { stepId: 3, status: StepStatusEnum.IN_PROGRESS },
        ],
        userId: 1,
      };

      const mockResults = [
        { ...mockStep, status: 'in_progress' },
        { ...mockStep, status: 'in_progress' },
      ];

      jest.spyOn(bulkUpdateStepsUseCase, 'execute').mockResolvedValue(mockResults as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual(mockResults);
      expect(bulkUpdateStepsUseCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should unlock steps when locked is false', async () => {
      const dto: BulkUpdateStepsDto = {
        updates: [
          { stepId: 1, locked: false },
        ],
        userId: 1,
      };

      const mockResults = [
        { ...mockStep, locked: false },
      ];

      jest.spyOn(bulkUpdateStepsUseCase, 'execute').mockResolvedValue(mockResults as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual(mockResults);
      expect(bulkUpdateStepsUseCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should handle null assigneeId', async () => {
      const dto: BulkUpdateStepsDto = {
        updates: [
          { stepId: 1, assigneeId: null },
        ],
        userId: 1,
      };

      const mockResults = [
        { ...mockStep, assigneeId: null },
      ];

      jest.spyOn(bulkUpdateStepsUseCase, 'execute').mockResolvedValue(mockResults as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual(mockResults);
      expect(bulkUpdateStepsUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });
});