import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Case } from '@domain/entities/case';
import { StepInstance } from '@domain/entities/step-instance';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { CreateCaseDto } from '@application/dto/case/create-case.dto';
import { CaseResponseDto } from '@application/dto/case/case-response.dto';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { CaseStatus } from '@domain/values/case-status';
import { StepStatus } from '@domain/values/step-status';

@Injectable()
export class CreateCaseUseCase {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IProcessTemplateRepository')
    private readonly processTemplateRepository: IProcessTemplateRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
    private readonly replanDomainService: ReplanDomainService,
  ) {}

  async execute(dto: CreateCaseDto): Promise<CaseResponseDto> {
    const processTemplate = await this.processTemplateRepository.findWithStepTemplates(
      dto.processId,
    );

    if (!processTemplate) {
      throw new NotFoundException(`Process template with ID ${dto.processId} not found`);
    }

    if (!processTemplate.getIsActive()) {
      throw new NotFoundException(`Process template with ID ${dto.processId} is not active`);
    }

    const caseEntity = new Case(
      null,
      dto.processId,
      dto.title,
      dto.goalDateUtc,
      CaseStatus.OPEN,
      dto.createdBy || null,
      new Date(),
      new Date(),
    );

    const savedCase = await this.caseRepository.save(caseEntity);

    // V2を使用して日付計算を修正
    const schedulePlan = await this.replanDomainService.calculateScheduleV2(
      processTemplate,
      new Date(dto.goalDateUtc),
    );

    console.log('Schedule Plan:', schedulePlan.steps.map(s => ({
      id: s.templateId,
      name: s.name,
      date: s.dueDateUtc,
    })));

    const stepInstances = schedulePlan.steps.map(
      (step) => {
        console.log(`Creating step instance for ${step.name} with date ${step.dueDateUtc}`);
        return new StepInstance(
          null,
          savedCase.getId()!,
          step.templateId,
          step.name,
          step.dueDateUtc,
          null,
          StepStatus.TODO,
          false,
          new Date(),
          new Date(),
        );
      },
    );

    const savedSteps = await this.stepInstanceRepository.saveMany(stepInstances);
    savedCase.setStepInstances(savedSteps);

    return this.toResponseDto(savedCase);
  }

  private toResponseDto(caseEntity: Case): CaseResponseDto {
    return {
      id: caseEntity.getId()!,
      processId: caseEntity.getProcessId(),
      title: caseEntity.getTitle(),
      goalDateUtc: caseEntity.getGoalDate().getDate(),
      status: caseEntity.getStatus().toString(),
      createdBy: caseEntity.getCreatedBy(),
      createdAt: caseEntity.getCreatedAt(),
      updatedAt: caseEntity.getUpdatedAt(),
      stepInstances: caseEntity.getStepInstances().map((step) => ({
        id: step.getId()!,
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