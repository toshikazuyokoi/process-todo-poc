import { Controller, Get, Post, Put, Delete, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCaseDto } from '@application/dto/case/create-case.dto';
import { UpdateCaseDto } from '@application/dto/case/update-case.dto';
import { CaseResponseDto } from '@application/dto/case/case-response.dto';
import { ReplanRequestDto } from '@application/dto/replan/replan-request.dto';
import { ReplanPreviewDto } from '@application/dto/replan/replan-response.dto';
import { CreateCaseUseCase } from '@application/usecases/case/create-case.usecase';
import { PreviewReplanUseCase } from '@application/usecases/replan/preview-replan.usecase';
import { ApplyReplanUseCase } from '@application/usecases/replan/apply-replan.usecase';
import { CaseRepository } from '@infrastructure/repositories/case.repository';
import { BulkUpdateCasesDto } from '@application/dto/case/bulk-update-cases.dto';
import { BulkDeleteCasesDto } from '@application/dto/case/bulk-delete-cases.dto';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';
import { CommentRepository } from '@infrastructure/repositories/comment.repository';

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CaseController {
  constructor(
    private readonly createCaseUseCase: CreateCaseUseCase,
    private readonly previewReplanUseCase: PreviewReplanUseCase,
    private readonly applyReplanUseCase: ApplyReplanUseCase,
    private readonly caseRepository: CaseRepository,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly commentRepository: CommentRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new case from process template' })
  @ApiResponse({ status: 201, type: CaseResponseDto })
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser('id') userId: number,
  ): Promise<CaseResponseDto> {
    // Set createdBy from authenticated user
    dto.createdBy = userId;
    return this.createCaseUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cases' })
  @ApiResponse({ status: 200, type: [CaseResponseDto] })
  async findAll(): Promise<CaseResponseDto[]> {
    const cases = await this.caseRepository.findAllWithStepInstances();
    return Promise.all(cases.map((c) => this.toResponseDto(c)));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a case by ID' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async findOne(@Param('id') id: string): Promise<CaseResponseDto> {
    const caseEntity = await this.caseRepository.findWithStepInstances(+id);
    if (!caseEntity) {
      throw new Error('Case not found');
    }
    return this.toResponseDto(caseEntity);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a case' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
  ): Promise<CaseResponseDto> {
    const caseEntity = await this.caseRepository.findWithStepInstances(+id);
    if (!caseEntity) {
      throw new Error('Case not found');
    }

    if (dto.title) {
      caseEntity.updateTitle(dto.title);
    }
    if (dto.goalDateUtc) {
      caseEntity.updateGoalDate(dto.goalDateUtc);
    }
    if (dto.status) {
      caseEntity.updateStatus(dto.status as any);
    }

    const updated = await this.caseRepository.update(caseEntity);
    const responseDto = this.toResponseDto(updated);
    
    // WebSocket経由でリアルタイム更新を送信
    this.realtimeGateway.broadcastCaseUpdate(+id, responseDto);
    
    return responseDto;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a case' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id') id: string): Promise<void> {
    await this.caseRepository.delete(+id);
  }

  @Post(':id/replan/preview')
  @ApiOperation({ summary: 'Preview replan for a case' })
  @ApiResponse({ status: 200, type: ReplanPreviewDto })
  async previewReplan(
    @Param('id') id: string,
    @Body() dto: ReplanRequestDto,
  ): Promise<ReplanPreviewDto> {
    return this.previewReplanUseCase.execute(+id, dto);
  }

  @Post(':id/replan/apply')
  @ApiOperation({ summary: 'Apply replan to a case' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async applyReplan(
    @Param('id') id: string,
    @Body() dto: ReplanRequestDto,
  ): Promise<CaseResponseDto> {
    return this.applyReplanUseCase.execute(+id, dto);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update multiple cases' })
  @ApiResponse({ status: 200, description: 'Cases updated successfully' })
  async bulkUpdate(@Body() dto: BulkUpdateCasesDto): Promise<{ updated: number }> {
    let updated = 0;
    
    for (const caseId of dto.caseIds) {
      const caseEntity = await this.caseRepository.findWithStepInstances(caseId);
      if (!caseEntity) {
        continue;
      }

      if (dto.status) {
        caseEntity.updateStatus(dto.status as any);
      }
      if (dto.assigneeId !== undefined) {
        // Update assignee for all step instances
        const stepInstances = caseEntity.getStepInstances();
        for (const step of stepInstances) {
          if (dto.assigneeId) {
            step.assignTo(dto.assigneeId);
          }
        }
      }
      if (dto.priority !== undefined) {
        // カスタムフィールドとして優先度を設定（将来的に実装）
        // caseEntity.setPriority(dto.priority);
      }

      await this.caseRepository.update(caseEntity);
      updated++;
    }

    return { updated };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete multiple cases' })
  @ApiResponse({ status: 200, description: 'Cases deleted successfully' })
  async bulkDelete(@Body() dto: BulkDeleteCasesDto): Promise<{ deleted: number }> {
    let deleted = 0;
    
    for (const caseId of dto.caseIds) {
      try {
        await this.caseRepository.delete(caseId);
        deleted++;
      } catch (error) {
        // Skip if case doesn't exist or can't be deleted
        console.error(`Failed to delete case ${caseId}:`, error);
      }
    }

    return { deleted };
  }

  private async toResponseDto(caseEntity: any): Promise<CaseResponseDto> {
    const stepInstances = caseEntity.getStepInstances();
    const stepIds = stepInstances.map((step: any) => step.getId()).filter((id: any) => id != null);
    
    // Get comment counts for all steps
    const commentCounts = await this.commentRepository.countByStepIds(stepIds);
    
    return {
      id: caseEntity.getId(),
      processId: caseEntity.getProcessId(),
      title: caseEntity.getTitle(),
      goalDateUtc: caseEntity.getGoalDate().getDate(),
      status: caseEntity.getStatus().toString(),
      createdBy: caseEntity.getCreatedBy(),
      createdAt: caseEntity.getCreatedAt(),
      updatedAt: caseEntity.getUpdatedAt(),
      stepInstances: stepInstances.map((step: any) => ({
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
        commentCount: commentCounts.get(step.getId()) || 0,
      })),
      progress: caseEntity.getProgress(),
    };
  }
}