import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessTemplate } from '@domain/entities/process-template';
import { StepTemplate } from '@domain/entities/step-template';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';

@Injectable()
export class ProcessTemplateRepository implements IProcessTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<ProcessTemplate | null> {
    const data = await this.prisma.processTemplate.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findAll(isActive?: boolean): Promise<ProcessTemplate[]> {
    const data = await this.prisma.processTemplate.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      include: {
        stepTemplates: true,
      },
    });

    return data.map((d) => this.toDomainWithSteps(d));
  }

  async findByName(name: string): Promise<ProcessTemplate | null> {
    const data = await this.prisma.processTemplate.findFirst({
      where: { name },
    });

    return data ? this.toDomain(data) : null;
  }

  async save(processTemplate: ProcessTemplate): Promise<ProcessTemplate> {
    const data = await this.prisma.processTemplate.create({
      data: {
        name: processTemplate.getName(),
        version: processTemplate.getVersion(),
        isActive: processTemplate.getIsActive(),
      },
    });

    return this.toDomain(data);
  }

  async update(processTemplate: ProcessTemplate): Promise<ProcessTemplate> {
    const id = processTemplate.getId();
    if (!id) {
      throw new Error('Cannot update process template without ID');
    }

    const stepTemplates = processTemplate.getStepTemplates();

    const data = await this.prisma.$transaction(async (tx) => {
      await tx.stepTemplate.deleteMany({
        where: { processId: id },
      });

      for (const stepTemplate of stepTemplates) {
        await tx.stepTemplate.create({
          data: {
            processId: id,
            seq: stepTemplate.getSeq(),
            name: stepTemplate.getName(),
            basis: stepTemplate.getBasis().toString(),
            offsetDays: stepTemplate.getOffset().getDays(),
            requiredArtifactsJson: stepTemplate.getRequiredArtifactsJson(),
            dependsOnJson: stepTemplate.getDependsOnJson(),
          },
        });
      }

      return await tx.processTemplate.update({
        where: { id },
        data: {
          name: processTemplate.getName(),
          version: processTemplate.getVersion(),
          isActive: processTemplate.getIsActive(),
        },
        include: {
          stepTemplates: true,
        },
      });
    });

    return this.toDomainWithSteps(data);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.stepTemplate.deleteMany({
        where: { processId: id },
      });
      await tx.processTemplate.delete({
        where: { id },
      });
    });
  }

  async findWithStepTemplates(id: number): Promise<ProcessTemplate | null> {
    const data = await this.prisma.processTemplate.findUnique({
      where: { id },
      include: {
        stepTemplates: true,
      },
    });

    return data ? this.toDomainWithSteps(data) : null;
  }

  private toDomain(data: any): ProcessTemplate {
    return new ProcessTemplate(
      data.id,
      data.name,
      data.version,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );
  }

  private toDomainWithSteps(data: any): ProcessTemplate {
    const processTemplate = new ProcessTemplate(
      data.id,
      data.name,
      data.version,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );

    const stepTemplates = data.stepTemplates.map(
      (step: any) =>
        new StepTemplate(
          step.id,
          step.processId,
          step.seq,
          step.name,
          step.basis,
          step.offsetDays,
          step.requiredArtifactsJson,
          step.dependsOnJson,
          step.createdAt,
          step.updatedAt,
        ),
    );

    processTemplate.setStepTemplates(stepTemplates);
    return processTemplate;
  }
}