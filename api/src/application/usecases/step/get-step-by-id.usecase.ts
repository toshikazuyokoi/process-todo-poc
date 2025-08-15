import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { GetStepDto } from '@application/dto/step/get-step.dto';
import { StepInstance } from '@domain/entities/step-instance';

@Injectable()
export class GetStepByIdUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: GetStepDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(dto.stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // Get assignee name if assigned
    let assigneeName: string | undefined;
    if (step.getAssigneeId()) {
      const user = await this.userRepository.findById(step.getAssigneeId()!);
      assigneeName = user?.getName();
    }

    return this.toResponseDto(step, assigneeName);
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