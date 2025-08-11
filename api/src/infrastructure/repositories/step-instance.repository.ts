import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StepInstance } from '@domain/entities/step-instance';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { StepStatus } from '@domain/values/step-status';

@Injectable()
export class StepInstanceRepository implements IStepInstanceRepository {
  private readonly logger = new Logger(StepInstanceRepository.name);
  
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<StepInstance | null> {
    const data = await this.prisma.stepInstance.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByCaseId(caseId: number): Promise<StepInstance[]> {
    const data = await this.prisma.stepInstance.findMany({
      where: { caseId },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByAssigneeId(assigneeId: number): Promise<StepInstance[]> {
    const data = await this.prisma.stepInstance.findMany({
      where: { assigneeId },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByStatus(status: StepStatus): Promise<StepInstance[]> {
    const data = await this.prisma.stepInstance.findMany({
      where: { status },
    });

    return data.map((d) => this.toDomain(d));
  }

  async save(stepInstance: StepInstance): Promise<StepInstance> {
    const data = await this.prisma.stepInstance.create({
      data: {
        caseId: stepInstance.getCaseId(),
        templateId: stepInstance.getTemplateId(),
        name: stepInstance.getName(),
        dueDateUtc: stepInstance.getDueDate()?.getDate() || null,
        assigneeId: stepInstance.getAssigneeId(),
        status: stepInstance.getStatus().toString(),
        locked: stepInstance.isLocked(),
      },
    });

    return this.toDomain(data);
  }

  async saveMany(stepInstances: StepInstance[]): Promise<StepInstance[]> {
    this.logger.log('=== saveMany START ===');
    this.logger.log(`Saving ${stepInstances.length} step instances`);
    
    // Log input data
    stepInstances.forEach((si, index) => {
      const dueDate = si.getDueDate()?.getDate();
      this.logger.log(`Input[${index}]: ${si.getName()}`);
      this.logger.log(`  Template ID: ${si.getTemplateId()}`);
      this.logger.log(`  Due Date: ${dueDate ? dueDate.toISOString() : 'null'}`);
      if (dueDate) {
        this.logger.log(`  Year: ${dueDate.getFullYear()}`);
      }
    });
    
    const dataToSave = stepInstances.map((stepInstance) => {
      const dueDateValue = stepInstance.getDueDate()?.getDate() || null;
      this.logger.debug(`Preparing to save: ${stepInstance.getName()} with date: ${dueDateValue?.toISOString() || 'null'}`);
      return {
        caseId: stepInstance.getCaseId(),
        templateId: stepInstance.getTemplateId(),
        name: stepInstance.getName(),
        dueDateUtc: dueDateValue,
        assigneeId: stepInstance.getAssigneeId(),
        status: stepInstance.getStatus().toString(),
        locked: stepInstance.isLocked(),
      };
    });
    
    const data = await this.prisma.$transaction(
      dataToSave.map((item) =>
        this.prisma.stepInstance.create({
          data: item,
        }),
      ),
    );
    
    // Log saved data
    this.logger.log('=== Data returned from database ===');
    data.forEach((d, index) => {
      this.logger.log(`Saved[${index}]: ${d.name}`);
      this.logger.log(`  ID: ${d.id}`);
      this.logger.log(`  Due Date UTC: ${d.dueDateUtc}`);
      if (d.dueDateUtc) {
        const date = new Date(d.dueDateUtc);
        this.logger.log(`  Year: ${date.getFullYear()}`);
        if (date.getFullYear() < 2000) {
          this.logger.error(`  ❌ ERROR: Date is in 1970! Raw value: ${d.dueDateUtc}`);
          // エラーをスローして処理を中止
          throw new Error(`Invalid date detected for step ${d.name}: ${d.dueDateUtc} (year: ${date.getFullYear()})`);
        }
      }
    });
    
    const result = data.map((d) => this.toDomain(d));
    
    this.logger.log('=== After toDomain conversion ===');
    result.forEach((r, index) => {
      const dueDate = r.getDueDate()?.getDate();
      this.logger.log(`Result[${index}]: ${r.getName()}`);
      this.logger.log(`  Due Date: ${dueDate ? dueDate.toISOString() : 'null'}`);
      if (dueDate && dueDate.getFullYear() < 2000) {
        this.logger.error(`  ❌ ERROR: Final date is in 1970!`);
      }
    });
    
    this.logger.log('=== saveMany END ===');
    return result;
  }

  async update(stepInstance: StepInstance): Promise<StepInstance> {
    const id = stepInstance.getId();
    if (!id) {
      throw new Error('Cannot update step instance without ID');
    }

    const data = await this.prisma.stepInstance.update({
      where: { id },
      data: {
        name: stepInstance.getName(),
        dueDateUtc: stepInstance.getDueDate()?.getDate() || null,
        assigneeId: stepInstance.getAssigneeId(),
        status: stepInstance.getStatus().toString(),
        locked: stepInstance.isLocked(),
      },
    });

    return this.toDomain(data);
  }

  async updateMany(stepInstances: StepInstance[]): Promise<StepInstance[]> {
    const data = await this.prisma.$transaction(
      stepInstances.map((stepInstance) => {
        const id = stepInstance.getId();
        if (!id) {
          throw new Error('Cannot update step instance without ID');
        }
        return this.prisma.stepInstance.update({
          where: { id },
          data: {
            name: stepInstance.getName(),
            dueDateUtc: stepInstance.getDueDate()?.getDate() || null,
            assigneeId: stepInstance.getAssigneeId(),
            status: stepInstance.getStatus().toString(),
            locked: stepInstance.isLocked(),
          },
        });
      }),
    );

    return data.map((d) => this.toDomain(d));
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.artifact.deleteMany({
        where: { stepId: id },
      });
      await tx.stepInstance.delete({
        where: { id },
      });
    });
  }

  async findOverdue(): Promise<StepInstance[]> {
    const data = await this.prisma.stepInstance.findMany({
      where: {
        dueDateUtc: {
          lt: new Date(),
        },
        status: {
          notIn: ['done', 'cancelled'],
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findUpcoming(days: number): Promise<StepInstance[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const data = await this.prisma.stepInstance.findMany({
      where: {
        dueDateUtc: {
          lte: futureDate,
          gte: new Date(),
        },
        status: {
          notIn: ['done', 'cancelled'],
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  private toDomain(data: any): StepInstance {
    return new StepInstance(
      data.id,
      data.caseId,
      data.templateId,
      data.name,
      data.dueDateUtc,
      data.assigneeId,
      data.status,
      data.locked,
      data.createdAt,
      data.updatedAt,
    );
  }
}