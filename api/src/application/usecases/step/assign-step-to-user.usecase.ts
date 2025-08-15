import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { AssignStepDto } from '@application/dto/step/assign-step.dto';
import { StepInstance } from '@domain/entities/step-instance';

@Injectable()
export class AssignStepToUserUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(stepId: number, dto: AssignStepDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
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
    this.eventEmitter.emit('step.assignee.updated', {
      caseId: step.getCaseId(),
      stepId: step.getId(),
      oldAssigneeId,
      newAssigneeId: dto.assigneeId,
      updatedBy: dto.userId,
    });

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