import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { ProcessTemplate } from '@domain/entities/process-template';
import { StepTemplate } from '@domain/entities/step-template';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';
import { CreateProcessTemplateDto } from '@application/dto/process-template/create-process-template.dto';
import { ProcessTemplateResponseDto } from '@application/dto/process-template/process-template-response.dto';
import { Basis } from '@domain/values/basis';

@Injectable()
export class CreateProcessTemplateUseCase {
  constructor(
    @Inject('IProcessTemplateRepository')
    private readonly processTemplateRepository: IProcessTemplateRepository,
  ) {}

  async execute(dto: CreateProcessTemplateDto): Promise<ProcessTemplateResponseDto> {
    const existingTemplate = await this.processTemplateRepository.findByName(dto.name);
    if (existingTemplate) {
      throw new ConflictException(`Process template with name "${dto.name}" already exists`);
    }

    const processTemplate = new ProcessTemplate(
      null,
      dto.name,
      1,
      true,
      new Date(),
      new Date(),
    );

    const savedTemplate = await this.processTemplateRepository.save(processTemplate);

    const stepTemplates = dto.stepTemplates.map(
      (stepDto) =>
        new StepTemplate(
          null,
          savedTemplate.getId()!,
          stepDto.seq,
          stepDto.name,
          stepDto.basis as Basis,
          stepDto.offsetDays,
          stepDto.requiredArtifacts || [],
          stepDto.dependsOn || [],
          new Date(),
          new Date(),
        ),
    );

    savedTemplate.setStepTemplates(stepTemplates);

    if (savedTemplate.hasCircularDependencies()) {
      throw new ConflictException('Step templates contain circular dependencies');
    }

    if (!savedTemplate.validateStepDependencies()) {
      throw new ConflictException('Invalid step dependencies');
    }

    const updatedTemplate = await this.processTemplateRepository.update(savedTemplate);

    return this.toResponseDto(updatedTemplate);
  }

  private toResponseDto(template: ProcessTemplate): ProcessTemplateResponseDto {
    return {
      id: template.getId()!,
      name: template.getName(),
      version: template.getVersion(),
      isActive: template.getIsActive(),
      createdAt: template.getCreatedAt(),
      updatedAt: template.getUpdatedAt(),
      stepTemplates: template.getStepTemplates().map((step) => ({
        id: step.getId()!,
        processId: step.getProcessId(),
        seq: step.getSeq(),
        name: step.getName(),
        basis: step.getBasis().toString(),
        offsetDays: step.getOffset().getDays(),
        requiredArtifacts: step.getRequiredArtifacts(),
        dependsOn: step.getDependsOn(),
        createdAt: step.getCreatedAt(),
        updatedAt: step.getUpdatedAt(),
      })),
    };
  }
}