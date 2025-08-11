import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { ReplanRequestDto } from '@application/dto/replan/replan-request.dto';
import { ReplanPreviewDto, StepDiffDto } from '@application/dto/replan/replan-response.dto';

@Injectable()
export class PreviewReplanUseCase {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IProcessTemplateRepository')
    private readonly processTemplateRepository: IProcessTemplateRepository,
    private readonly replanDomainService: ReplanDomainService,
  ) {}

  async execute(caseId: number, dto: ReplanRequestDto): Promise<ReplanPreviewDto> {
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

    const criticalPath = this.replanDomainService.findCriticalPath(newSchedulePlan);

    const stepDiffs: StepDiffDto[] = diffs.map((diff) => {
      const step = existingSteps.find((s) => s.getId() === diff.stepId);
      return {
        stepId: diff.stepId,
        stepName: step?.getName() || '',
        oldDueDate: diff.oldDueDate,
        newDueDate: diff.newDueDate,
        isLocked: diff.isLocked,
      };
    });

    return {
      caseId: caseEntity.getId()!,
      oldGoalDate: caseEntity.getGoalDate().getDate(),
      newGoalDate: new Date(dto.goalDateUtc),
      diffs: stepDiffs,
      criticalPath,
    };
  }
}