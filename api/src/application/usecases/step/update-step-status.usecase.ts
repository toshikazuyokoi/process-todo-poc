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

    const oldStatus = step.getStatus().toString();
    
    try {
      // Let domain handle validation
      step.updateStatus(dto.status as unknown as StepStatus);
    } catch (error) {
      // Convert domain error to appropriate HTTP error
      if (error instanceof Error && error.message.includes('Cannot transition from')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    
    const updatedStep = await this.stepRepository.update(step);

    // Emit event for real-time updates
    const stepIdValue = step.getId();
    if (stepIdValue) {
      this.eventEmitter.emit('step.status.updated', {
        caseId: step.getCaseId(),
        stepId: stepIdValue,
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
}