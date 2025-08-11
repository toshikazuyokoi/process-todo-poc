import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StepInstanceRepository } from '@infrastructure/repositories/step-instance.repository';
import { StepStatus } from '@domain/values/step-status';

@ApiTags('Steps')
@Controller('steps')
export class StepController {
  constructor(private readonly stepInstanceRepository: StepInstanceRepository) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a step instance by ID' })
  async findOne(@Param('id') id: string) {
    const step = await this.stepInstanceRepository.findById(+id);
    if (!step) {
      throw new Error('Step not found');
    }
    return this.toResponseDto(step);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update step status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
  ) {
    const step = await this.stepInstanceRepository.findById(+id);
    if (!step) {
      throw new Error('Step not found');
    }

    step.updateStatus(dto.status as StepStatus);
    const updated = await this.stepInstanceRepository.update(step);
    return this.toResponseDto(updated);
  }

  @Put(':id/assignee')
  @ApiOperation({ summary: 'Assign step to user' })
  async assignTo(
    @Param('id') id: string,
    @Body() dto: { assigneeId: number | null },
  ) {
    const step = await this.stepInstanceRepository.findById(+id);
    if (!step) {
      throw new Error('Step not found');
    }

    step.assignTo(dto.assigneeId);
    const updated = await this.stepInstanceRepository.update(step);
    return this.toResponseDto(updated);
  }

  @Put(':id/lock')
  @ApiOperation({ summary: 'Lock a step' })
  async lock(@Param('id') id: string) {
    const step = await this.stepInstanceRepository.findById(+id);
    if (!step) {
      throw new Error('Step not found');
    }

    step.lock();
    const updated = await this.stepInstanceRepository.update(step);
    return this.toResponseDto(updated);
  }

  @Put(':id/unlock')
  @ApiOperation({ summary: 'Unlock a step' })
  async unlock(@Param('id') id: string) {
    const step = await this.stepInstanceRepository.findById(+id);
    if (!step) {
      throw new Error('Step not found');
    }

    step.unlock();
    const updated = await this.stepInstanceRepository.update(step);
    return this.toResponseDto(updated);
  }

  private toResponseDto(step: any) {
    return {
      id: step.getId(),
      caseId: step.getCaseId(),
      templateId: step.getTemplateId(),
      name: step.getName(),
      dueDateUtc: step.getDueDate()?.getDate() || null,
      assigneeId: step.getAssigneeId(),
      status: step.getStatus().toString(),
      locked: step.isLocked(),
      createdAt: step.getCreatedAt(),
      updatedAt: step.getUpdatedAt(),
      isOverdue: step.isOverdue(),
      daysUntilDue: step.getDaysUntilDue(),
    };
  }
}