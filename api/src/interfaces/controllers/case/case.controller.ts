import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCaseDto } from '@application/dto/case/create-case.dto';
import { UpdateCaseDto } from '@application/dto/case/update-case.dto';
import { CaseResponseDto } from '@application/dto/case/case-response.dto';
import { ReplanRequestDto } from '@application/dto/replan/replan-request.dto';
import { ReplanPreviewDto } from '@application/dto/replan/replan-response.dto';
import { CreateCaseUseCase } from '@application/usecases/case/create-case.usecase';
import { PreviewReplanUseCase } from '@application/usecases/replan/preview-replan.usecase';
import { ApplyReplanUseCase } from '@application/usecases/replan/apply-replan.usecase';
import { CaseRepository } from '@infrastructure/repositories/case.repository';

@ApiTags('Cases')
@Controller('cases')
export class CaseController {
  constructor(
    private readonly createCaseUseCase: CreateCaseUseCase,
    private readonly previewReplanUseCase: PreviewReplanUseCase,
    private readonly applyReplanUseCase: ApplyReplanUseCase,
    private readonly caseRepository: CaseRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new case from process template' })
  @ApiResponse({ status: 201, type: CaseResponseDto })
  async create(@Body() dto: CreateCaseDto): Promise<CaseResponseDto> {
    return this.createCaseUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cases' })
  @ApiResponse({ status: 200, type: [CaseResponseDto] })
  async findAll(): Promise<CaseResponseDto[]> {
    const cases = await this.caseRepository.findAll();
    return cases.map((c) => this.toResponseDto(c));
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
    return this.toResponseDto(updated);
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

  private toResponseDto(caseEntity: any): CaseResponseDto {
    return {
      id: caseEntity.getId(),
      processId: caseEntity.getProcessId(),
      title: caseEntity.getTitle(),
      goalDateUtc: caseEntity.getGoalDate().getDate(),
      status: caseEntity.getStatus().toString(),
      createdBy: caseEntity.getCreatedBy(),
      createdAt: caseEntity.getCreatedAt(),
      updatedAt: caseEntity.getUpdatedAt(),
      stepInstances: caseEntity.getStepInstances().map((step: any) => ({
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
      })),
      progress: caseEntity.getProgress(),
    };
  }
}