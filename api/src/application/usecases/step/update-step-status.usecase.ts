import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { UpdateStepStatusDto } from '@application/dto/step/update-step-status.dto';
import { StepInstance } from '@domain/entities/step-instance';
import { StepStatus } from '@domain/values/step-status';

@Injectable()
export class UpdateStepStatusUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
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
    step.updateStatus(new StepStatus(dto.status));
    const updatedStep = await this.stepRepository.update(step);

    // Emit event for real-time updates
    this.eventEmitter.emit('step.status.updated', {
      caseId: step.getCaseId(),
      stepId: step.getId(),
      oldStatus,
      newStatus: dto.status,
      updatedBy: dto.userId,
    });

    // Get assignee name if assigned
    let assigneeName: string | undefined;
    if (updatedStep.getAssigneeId()) {
      const user = await this.userRepository.findById(updatedStep.getAssigneeId()!);
      assigneeName = user?.getName();
    }

    return this.toResponseDto(updatedStep, assigneeName);
  }

  private isValidStatusTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'not_started': ['in_progress', 'cancelled'],
      'in_progress': ['done', 'cancelled', 'not_started'],
      'done': ['in_progress'], // Allow reopening
      'cancelled': ['not_started'], // Allow reactivating
    };

    return validTransitions[from]?.includes(to) || false;
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