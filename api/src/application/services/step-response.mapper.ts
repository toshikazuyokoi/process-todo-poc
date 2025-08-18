import { Injectable } from '@nestjs/common';
import { StepInstance } from '@domain/entities/step-instance';
import { StepResponseDto } from '@application/dto/step/step-response.dto';

@Injectable()
export class StepResponseMapper {
  toResponseDto(step: StepInstance, assigneeName?: string): StepResponseDto {
    const now = new Date();
    const dueDate = step.getDueDate()?.getDate();
    let isOverdue = false;
    let daysUntilDue: number | null = null;

    if (dueDate) {
      const status = step.getStatus().toString();
      isOverdue = dueDate < now && status !== 'done' && status !== 'cancelled';
      daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const stepId = step.getId();
    if (!stepId) {
      throw new Error(`Step ID is required but was null for step: ${step.getName()}`);
    }

    return {
      id: stepId,
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

  toResponseDtoArray(steps: StepInstance[], assigneeNames?: Map<number, string>): StepResponseDto[] {
    return steps.map(step => {
      const assigneeName = step.getAssigneeId() 
        ? assigneeNames?.get(step.getAssigneeId()!) 
        : undefined;
      return this.toResponseDto(step, assigneeName);
    });
  }
}