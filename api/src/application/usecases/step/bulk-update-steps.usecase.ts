import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { BulkUpdateStepsDto, BulkUpdateStepDto } from '@application/dto/step/bulk-update-steps.dto';
import { StepResponseMapper } from '@application/services/step-response.mapper';
import { StepStatus } from '@domain/values/step-status';

interface UpdateResult {
  success: boolean;
  stepId: number;
  data?: StepResponseDto;
  error?: string;
}

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
    const results: UpdateResult[] = [];
    const successfulUpdates: StepResponseDto[] = [];

    // Process each update
    for (const update of dto.updates) {
      try {
        const result = await this.processUpdate(update, dto.userId);
        results.push({
          success: true,
          stepId: update.stepId,
          data: result,
        });
        successfulUpdates.push(result);
      } catch (error) {
        this.logger.error(`Failed to update step ${update.stepId}:`, error);
        results.push({
          success: false,
          stepId: update.stepId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    this.logger.log(`Bulk update completed: ${successCount} succeeded, ${failureCount} failed`);

    // Emit bulk update event
    this.eventEmitter.emit('steps.bulk.updated', {
      userId: dto.userId,
      totalCount: dto.updates.length,
      successCount,
      failureCount,
      results,
    });

    // Return only successful updates
    return successfulUpdates;
  }

  private async processUpdate(update: BulkUpdateStepDto, userId?: number): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(update.stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${update.stepId} not found`);
    }

    let hasChanges = false;

    // Update status if provided
    if (update.status !== undefined) {
      step.updateStatus(update.status as StepStatus);
      hasChanges = true;
    }

    // Update assignee if provided
    if (update.assigneeId !== undefined) {
      // Validate user exists if assigning
      if (update.assigneeId !== null) {
        const user = await this.userRepository.findById(update.assigneeId);
        if (!user) {
          throw new NotFoundException(`User with ID ${update.assigneeId} not found`);
        }
      }
      step.assignTo(update.assigneeId);
      hasChanges = true;
    }

    // Update lock status if provided
    if (update.locked !== undefined) {
      if (update.locked) {
        step.lock();
      } else {
        step.unlock();
      }
      hasChanges = true;
    }

    // Save if there were changes
    let updatedStep = step;
    if (hasChanges) {
      updatedStep = await this.stepRepository.update(step);

      // Emit individual update event
      const stepId = step.getId();
      if (stepId) {
        this.eventEmitter.emit('step.updated', {
          caseId: step.getCaseId(),
          stepId,
          updatedBy: userId,
          changes: {
            status: update.status,
            assigneeId: update.assigneeId,
            locked: update.locked,
          },
        });
      }
    }

    // Get assignee name if assigned
    let assigneeName: string | undefined;
    if (updatedStep.getAssigneeId()) {
      const user = await this.userRepository.findById(updatedStep.getAssigneeId()!);
      assigneeName = user?.getName();
    }

    return this.stepResponseMapper.toResponseDto(updatedStep, assigneeName);
  }
}