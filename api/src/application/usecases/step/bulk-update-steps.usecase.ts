import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { BulkUpdateStepsDto, BulkUpdateStepDto } from '@application/dto/step/bulk-update-steps.dto';
import { StepResponseMapper } from '@application/services/step-response.mapper';
import { StepStatus } from '@domain/values/step-status';
import { StepInstance } from '@domain/entities/step-instance';

@Injectable()
export class BulkUpdateStepsUseCase {
  private readonly logger = new Logger(BulkUpdateStepsUseCase.name);

  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly stepResponseMapper: StepResponseMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: BulkUpdateStepsDto): Promise<StepResponseDto[]> {
    // First, validate all updates and prepare domain objects
    const stepUpdates: { step: StepInstance; changes: BulkUpdateStepDto }[] = [];
    
    for (const update of dto.updates) {
      const step = await this.stepRepository.findById(update.stepId);
      
      if (!step) {
        throw new NotFoundException(`Step with ID ${update.stepId} not found`);
      }

      // Validate user exists if assigning
      if (update.assigneeId !== undefined && update.assigneeId !== null) {
        const user = await this.userRepository.findById(update.assigneeId);
        if (!user) {
          throw new NotFoundException(`User with ID ${update.assigneeId} not found`);
        }
      }

      stepUpdates.push({ step, changes: update });
    }

    // Apply all changes to domain objects (validation happens here)
    const updatedSteps: StepInstance[] = [];
    for (const { step, changes } of stepUpdates) {
      let hasChanges = false;

      if (changes.status !== undefined) {
        try {
          step.updateStatus(changes.status as unknown as StepStatus);
          hasChanges = true;
        } catch (error) {
          // Re-throw with step context for better error reporting
          if (error instanceof Error) {
            throw new BadRequestException(`Step ${changes.stepId}: ${error.message}`);
          }
          throw error;
        }
      }

      if (changes.assigneeId !== undefined) {
        step.assignTo(changes.assigneeId);
        hasChanges = true;
      }

      if (changes.locked !== undefined) {
        if (changes.locked) {
          step.lock();
        } else {
          step.unlock();
        }
        hasChanges = true;
      }

      if (hasChanges) {
        updatedSteps.push(step);
      }
    }

    // Execute all updates in a single transaction
    const finalUpdatedSteps = await this.stepRepository.updateManyInTransaction(updatedSteps);

    // Emit events after successful transaction
    this.eventEmitter.emit('steps.bulk.updated', {
      userId: dto.userId,
      totalCount: dto.updates.length,
      successCount: finalUpdatedSteps.length,
      failureCount: 0,
      stepIds: finalUpdatedSteps.map(s => s.getId()).filter(Boolean),
    });

    // Individual step events
    for (const step of finalUpdatedSteps) {
      const stepId = step.getId();
      if (stepId) {
        this.eventEmitter.emit('step.updated', {
          caseId: step.getCaseId(),
          stepId,
          updatedBy: dto.userId,
        });
      }
    }

    // Convert to response DTOs
    const responseDtos: StepResponseDto[] = [];
    for (const step of finalUpdatedSteps) {
      let assigneeName: string | undefined;
      if (step.getAssigneeId()) {
        const user = await this.userRepository.findById(step.getAssigneeId()!);
        assigneeName = user?.getName();
      }
      responseDtos.push(this.stepResponseMapper.toResponseDto(step, assigneeName));
    }

    return responseDtos;
  }
}