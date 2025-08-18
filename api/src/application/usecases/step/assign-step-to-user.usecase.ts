import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { AssignStepDto } from '@application/dto/step/assign-step.dto';
import { StepResponseMapper } from '@application/services/step-response.mapper';

@Injectable()
export class AssignStepToUserUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly stepResponseMapper: StepResponseMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(stepId: number, dto: AssignStepDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    // Check if step is locked
    if (step.isLocked()) {
      throw new BadRequestException(
        `Step with ID ${stepId} is locked and cannot be modified`
      );
    }

    // Validate user exists if assigning
    let assigneeName: string | undefined;
    if (dto.assigneeId) {
      const user = await this.userRepository.findById(dto.assigneeId);
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.assigneeId} not found`);
      }
      assigneeName = user.getName();
    }

    // Update assignee
    const oldAssigneeId = step.getAssigneeId();
    step.assignTo(dto.assigneeId || null);
    const updatedStep = await this.stepRepository.update(step);

    // Emit event for real-time updates
    const stepIdValue = step.getId();
    if (stepIdValue) {
      this.eventEmitter.emit('step.assignee.updated', {
        caseId: step.getCaseId(),
        stepId: stepIdValue,
        oldAssigneeId,
        newAssigneeId: dto.assigneeId,
        updatedBy: dto.userId,
      });
    }

    return this.stepResponseMapper.toResponseDto(updatedStep, assigneeName);
  }
}