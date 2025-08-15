import { Test, TestingModule } from '@nestjs/testing';
import { StepController } from './step.controller';
import { StepInstanceRepository } from '@infrastructure/repositories/step-instance.repository';
import { UserRepository } from '@infrastructure/repositories/user.repository';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';
import { CaseRepository } from '@infrastructure/repositories/case.repository';
import { AssignStepToUserUseCase } from '@application/usecases/step/assign-step-to-user.usecase';
import { UpdateStepStatusUseCase } from '@application/usecases/step/update-step-status.usecase';
import { LockStepUseCase } from '@application/usecases/step/lock-step.usecase';
import { UnlockStepUseCase } from '@application/usecases/step/unlock-step.usecase';
import { GetStepByIdUseCase } from '@application/usecases/step/get-step-by-id.usecase';
import { BulkUpdateStepsUseCase } from '@application/usecases/step/bulk-update-steps.usecase';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

describe('StepController Unit Tests', () => {
  let controller: StepController;
  let assignStepToUserUseCase: AssignStepToUserUseCase;

  const mockStep = {
    getId: () => 1,
    getName: () => 'Test Step',
    getAssigneeId: () => null,
    getStatus: () => ({ toString: () => 'todo' }),
    getCaseId: () => 1,
    isLocked: () => false,
    getCreatedAt: () => new Date(),
    getUpdatedAt: () => new Date(),
    getDueDate: () => null,
    getStartDate: () => null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StepController],
      providers: [
        {
          provide: AssignStepToUserUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateStepStatusUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: LockStepUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UnlockStepUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetStepByIdUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: BulkUpdateStepsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: 'IStepInstanceRepository',
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: 'IUserRepository',
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: 'ICaseRepository',
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: RealtimeGateway,
          useValue: {
            broadcastStepUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StepController>(StepController);
    assignStepToUserUseCase = module.get<AssignStepToUserUseCase>(AssignStepToUserUseCase);
  });

  describe('assignTo', () => {
    it('should assign a user to a step', async () => {
      const stepId = 1;
      const assigneeId = 2;
      const updatedStep = { ...mockStep, getAssigneeId: () => assigneeId };

      jest.spyOn(assignStepToUserUseCase, 'execute').mockResolvedValue(updatedStep as any);

      const result = await controller.assignTo(stepId, { assigneeId });

      expect(assignStepToUserUseCase.execute).toHaveBeenCalledWith({ stepId, assigneeId });
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('assigneeId', assigneeId);
    });

    it('should unassign a user when assigneeId is null', async () => {
      const stepId = 1;
      const updatedStep = { ...mockStep, getAssigneeId: () => null };

      jest.spyOn(assignStepToUserUseCase, 'execute').mockResolvedValue(updatedStep as any);

      const result = await controller.assignTo(stepId, { assigneeId: null });

      expect(assignStepToUserUseCase.execute).toHaveBeenCalledWith({ stepId, assigneeId: null });
      expect(result).toHaveProperty('assigneeId', null);
    });

    it('should throw an error if step not found', async () => {
      const stepId = 999;
      
      jest.spyOn(assignStepToUserUseCase, 'execute').mockRejectedValue(new Error('Step not found'));

      await expect(controller.assignTo(stepId, { assigneeId: 1 })).rejects.toThrow('Step not found');
    });
  });
});