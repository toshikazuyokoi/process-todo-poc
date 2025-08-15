import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { UpdateStepStatusDto } from '@application/dto/step/update-step-status.dto';
import { StepResponseMapper } from '@application/services/step-response.mapper';
import { StepStatus } from '@domain/values/step-status';

@Injectable()
export class UpdateStepStatusUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly stepResponseMapper: StepResponseMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(stepId: number, dto: UpdateStepStatusDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    // Validate status transition
    const currentStatus = step.getStatus().toString();
    if (!this.isValidStatusTransition(currentStatus, dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${dto.status}`
      );
    }

    // Update status
    const oldStatus = currentStatus;
    step.updateStatus(dto.status as StepStatus);
    const updatedStep = await this.stepRepository.update(step);

    // Emit event for real-time updates
    const stepId = step.getId();
    if (stepId) {
      this.eventEmitter.emit('step.status.updated', {
        caseId: step.getCaseId(),
        stepId,
        oldStatus,
        newStatus: dto.status,
        updatedBy: dto.userId,
      });
    }

    // Get assignee name if assigned
    let assigneeName: string | undefined;
    if (updatedStep.getAssigneeId()) {
      const user = await this.userRepository.findById(updatedStep.getAssigneeId()!);
      assigneeName = user?.getName();
    }

    return this.stepResponseMapper.toResponseDto(updatedStep, assigneeName);
  }

  private isValidStatusTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'todo': ['in_progress', 'blocked', 'cancelled'],
      'in_progress': ['done', 'todo', 'blocked', 'cancelled'],
      'done': [], // Cannot transition from done
      'blocked': ['todo', 'in_progress', 'cancelled'],
      'cancelled': ['todo'], // Allow reactivating
    };

    return validTransitions[from]?.includes(to) || false;
  }
}