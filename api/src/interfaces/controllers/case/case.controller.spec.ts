import { Test, TestingModule } from '@nestjs/testing';
import { CaseController } from './case.controller';
import { CreateCaseUseCase } from '@application/usecases/case/create-case.usecase';
import { PreviewReplanUseCase } from '@application/usecases/replan/preview-replan.usecase';
import { ApplyReplanUseCase } from '@application/usecases/replan/apply-replan.usecase';
import { CaseRepository } from '@infrastructure/repositories/case.repository';
import { BulkUpdateCasesDto } from '@application/dto/case/bulk-update-cases.dto';
import { BulkDeleteCasesDto } from '@application/dto/case/bulk-delete-cases.dto';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';

describe('CaseController - Bulk Operations', () => {
  let controller: CaseController;
  let caseRepository: CaseRepository;

  const mockCase = {
    getId: () => 1,
    getProcessId: () => 1,
    getTitle: () => 'Test Case',
    getGoalDate: () => ({ getDate: () => new Date() }),
    getStatus: () => ({ toString: () => 'active' }),
    getCreatedBy: () => 1,
    getCreatedAt: () => new Date(),
    getUpdatedAt: () => new Date(),
    getStepInstances: () => [
      {
        getId: () => 1,
        getCaseId: () => 1,
        getTemplateId: () => 1,
        getName: () => 'Step 1',
        getDueDate: () => ({ getDate: () => new Date() }),
        getAssigneeId: () => null,
        getStatus: () => ({ toString: () => 'pending' }),
        isLocked: () => false,
        getCreatedAt: () => new Date(),
        getUpdatedAt: () => new Date(),
        assignTo: jest.fn(),
      },
    ],
    getProgress: () => 0,
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaseController],
      providers: [
        {
          provide: CreateCaseUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: PreviewReplanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ApplyReplanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CaseRepository,
          useValue: {
            findWithStepInstances: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RealtimeGateway,
          useValue: {
            sendCaseUpdate: jest.fn(),
            sendStepUpdate: jest.fn(),
            broadcast: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CaseController>(CaseController);
    caseRepository = module.get<CaseRepository>(CaseRepository);
  });

  describe('bulkUpdate', () => {
    it('should update multiple cases successfully', async () => {
      const dto: BulkUpdateCasesDto = {
        caseIds: [1, 2, 3],
        status: 'completed',
        assigneeId: 5,
      };

      jest.spyOn(caseRepository, 'findWithStepInstances')
        .mockResolvedValueOnce(mockCase as any)
        .mockResolvedValueOnce(mockCase as any)
        .mockResolvedValueOnce(mockCase as any);
      
      jest.spyOn(caseRepository, 'update').mockResolvedValue(mockCase as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual({ updated: 3 });
      expect(caseRepository.findWithStepInstances).toHaveBeenCalledTimes(3);
      expect(caseRepository.update).toHaveBeenCalledTimes(3);
      expect(mockCase.updateStatus).toHaveBeenCalledWith('completed');
    });

    it('should skip non-existent cases', async () => {
      const dto: BulkUpdateCasesDto = {
        caseIds: [1, 999, 3],
        status: 'completed',
      };

      jest.spyOn(caseRepository, 'findWithStepInstances')
        .mockResolvedValueOnce(mockCase as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCase as any);
      
      jest.spyOn(caseRepository, 'update').mockResolvedValue(mockCase as any);

      const result = await controller.bulkUpdate(dto);

      expect(result).toEqual({ updated: 2 });
      expect(caseRepository.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple cases successfully', async () => {
      const dto: BulkDeleteCasesDto = {
        caseIds: [1, 2, 3],
      };

      jest.spyOn(caseRepository, 'delete').mockResolvedValue(undefined);

      const result = await controller.bulkDelete(dto);

      expect(result).toEqual({ deleted: 3 });
      expect(caseRepository.delete).toHaveBeenCalledTimes(3);
      expect(caseRepository.delete).toHaveBeenCalledWith(1);
      expect(caseRepository.delete).toHaveBeenCalledWith(2);
      expect(caseRepository.delete).toHaveBeenCalledWith(3);
    });

    it('should handle delete errors gracefully', async () => {
      const dto: BulkDeleteCasesDto = {
        caseIds: [1, 2, 3],
      };

      jest.spyOn(caseRepository, 'delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined);

      const result = await controller.bulkDelete(dto);

      expect(result).toEqual({ deleted: 2 });
      expect(caseRepository.delete).toHaveBeenCalledTimes(3);
    });
  });
});