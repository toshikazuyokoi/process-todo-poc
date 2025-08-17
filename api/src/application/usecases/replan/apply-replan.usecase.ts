import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { ReplanRequestDto } from '@application/dto/replan/replan-request.dto';
import { CaseResponseDto } from '@application/dto/case/case-response.dto';

@Injectable()
export class ApplyReplanUseCase {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IProcessTemplateRepository')
    private readonly processTemplateRepository: IProcessTemplateRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
    private readonly replanDomainService: ReplanDomainService,
  ) {}

  async execute(caseId: number, dto: ReplanRequestDto): Promise<CaseResponseDto> {
    const caseEntity = await this.caseRepository.findWithStepInstances(caseId);
    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const processTemplate = await this.processTemplateRepository.findWithStepTemplates(
      caseEntity.getProcessId(),
    );
    if (!processTemplate) {
      throw new NotFoundException(
        `Process template with ID ${caseEntity.getProcessId()} not found`,
      );
    }

    const lockedStepIds = new Set(dto.lockedStepIds || []);
    const existingSteps = caseEntity.getStepInstances();

    // V2を使用して日付計算を修正
    const newSchedulePlan = await this.replanDomainService.calculateScheduleV2(
      processTemplate,
      new Date(dto.goalDateUtc),
      existingSteps,
      lockedStepIds,
    );

    const diffs = this.replanDomainService.calculateDiff(
      newSchedulePlan,
      existingSteps,
      lockedStepIds,
    );

    for (const diff of diffs) {
      const step = existingSteps.find((s) => s.getId() === diff.stepId);
      if (step && !diff.isLocked) {
        step.updateStartDate(diff.newStartDate);
        step.updateDueDate(diff.newDueDate);
      }
    }

    await this.stepInstanceRepository.updateMany(existingSteps);

    caseEntity.updateGoalDate(dto.goalDateUtc);
    const updatedCase = await this.caseRepository.update(caseEntity);

    return this.toResponseDto(updatedCase);
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
        startDateUtc: step.getStartDate()?.getDate() || null,
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