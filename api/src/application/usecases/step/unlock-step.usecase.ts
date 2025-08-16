import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { UnlockStepDto } from '@application/dto/step/unlock-step.dto';
import { StepResponseMapper } from '@application/services/step-response.mapper';

@Injectable()
export class UnlockStepUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly stepResponseMapper: StepResponseMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: UnlockStepDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(dto.stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // Check if already unlocked
    if (!step.isLocked()) {
      throw new ConflictException(`Step with ID ${dto.stepId} is already unlocked`);
    }

    // Unlock the step
    step.unlock();
    const updatedStep = await this.stepRepository.update(step);

    // Emit event for real-time updates
    const stepIdValue = step.getId();
    if (stepIdValue) {
      this.eventEmitter.emit('step.unlocked', {
        caseId: step.getCaseId(),
        stepId: stepIdValue,
        unlockedBy: dto.userId,
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