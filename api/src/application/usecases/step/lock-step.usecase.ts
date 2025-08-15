import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { LockStepDto } from '@application/dto/step/lock-step.dto';
import { StepInstance } from '@domain/entities/step-instance';

@Injectable()
export class LockStepUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: LockStepDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(dto.stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // Check if already locked
    if (step.isLocked()) {
      throw new ConflictException(`Step with ID ${dto.stepId} is already locked`);
    }

    // Lock the step
    step.lock();
    const updatedStep = await this.stepRepository.update(step);

    // Emit event for real-time updates
    this.eventEmitter.emit('step.locked', {
      caseId: step.getCaseId(),
      stepId: step.getId(),
      lockedBy: dto.userId,
    });

    // Get assignee name if assigned
    let assigneeName: string | undefined;
    if (updatedStep.getAssigneeId()) {
      const user = await this.userRepository.findById(updatedStep.getAssigneeId()!);
      assigneeName = user?.getName();
    }

    return this.toResponseDto(updatedStep, assigneeName);
  }

  private toResponseDto(step: StepInstance, assigneeName?: string): StepResponseDto {
    const now = new Date();
    const dueDate = step.getDueDate()?.getDate();
    let isOverdue = false;
    let daysUntilDue: number | null = null;

    if (dueDate) {
      isOverdue = dueDate < now && step.getStatus().toString() !== 'done' && step.getStatus().toString() !== 'cancelled';
      daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: step.getId()!,
      caseId: step.getCaseId(),
      templateId: step.getTemplateId(),
      name: step.getName(),
      startDateUtc: step.getStartDate()?.getDate() || null,
      dueDateUtc: dueDate || null,
      assigneeId: step.getAssigneeId(),
      assigneeName,
      status: step.getStatus().toString(),
      locked: step.isLocked(),
      createdAt: step.getCreatedAt(),
      updatedAt: step.getUpdatedAt(),
      isOverdue,
      daysUntilDue,
    };
  }
}