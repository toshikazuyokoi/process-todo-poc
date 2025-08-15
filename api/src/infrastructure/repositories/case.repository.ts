import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Case } from '@domain/entities/case';
import { StepInstance } from '@domain/entities/step-instance';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { CaseStatus } from '@domain/values/case-status';

@Injectable()
export class CaseRepository implements ICaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Case | null> {
    const data = await this.prisma.case.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findAll(status?: CaseStatus): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: status ? { status } : undefined,
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByProcessId(processId: number): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: { processId },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByUserId(userId: number): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: { createdBy: userId },
    });

    return data.map((d) => this.toDomain(d));
  }

  async save(caseEntity: Case): Promise<Case> {
    // ドメインのステータス値（小文字）をデータベースの値（大文字）に変換
    const statusMap: Record<string, string> = {
      'open': 'OPEN',
      'in_progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'on_hold': 'ON_HOLD',
    };
    
    const dbStatus = statusMap[caseEntity.getStatus().toString()] || caseEntity.getStatus().toString().toUpperCase();
    
    const data = await this.prisma.case.create({
      data: {
        processId: caseEntity.getProcessId(),
        title: caseEntity.getTitle(),
        goalDateUtc: caseEntity.getGoalDate().getDate(),
        status: dbStatus,
        createdBy: caseEntity.getCreatedBy(),
      },
    });

    return this.toDomain(data);
  }

  async update(caseEntity: Case): Promise<Case> {
    const id = caseEntity.getId();
    if (!id) {
      throw new Error('Cannot update case without ID');
    }

    // ドメインのステータス値（小文字）をデータベースの値（大文字）に変換
    const statusMap: Record<string, string> = {
      'open': 'OPEN',
      'in_progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'on_hold': 'ON_HOLD',
    };
    
    const dbStatus = statusMap[caseEntity.getStatus().toString()] || caseEntity.getStatus().toString().toUpperCase();

    const data = await this.prisma.case.update({
      where: { id },
      data: {
        title: caseEntity.getTitle(),
        goalDateUtc: caseEntity.getGoalDate().getDate(),
        status: dbStatus,
      },
      include: {
        stepInstances: true,
      },
    });

    return this.toDomainWithSteps(data);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const stepInstances = await tx.stepInstance.findMany({
        where: { caseId: id },
      });

      for (const step of stepInstances) {
        await tx.artifact.deleteMany({
          where: { stepId: step.id },
        });
      }

      await tx.stepInstance.deleteMany({
        where: { caseId: id },
      });

      await tx.case.delete({
        where: { id },
      });
    });
  }

  async findWithStepInstances(id: number): Promise<Case | null> {
    const data = await this.prisma.case.findUnique({
      where: { id },
      include: {
        stepInstances: true,
      },
    });

    return data ? this.toDomainWithSteps(data) : null;
  }

  async findUpcoming(days: number): Promise<Case[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const data = await this.prisma.case.findMany({
      where: {
        goalDateUtc: {
          lte: futureDate,
          gte: new Date(),
        },
        status: {
          in: ['open', 'in_progress'],
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findOverdue(): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: {
        goalDateUtc: {
          lt: new Date(),
        },
        status: {
          in: ['OPEN', 'IN_PROGRESS'],  // データベースは大文字を使用
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  private toDomain(data: any): Case {
    // データベースのステータス値（大文字）をドメインの値（小文字）に変換
    const statusMap: Record<string, string> = {
      'OPEN': 'open',
      'IN_PROGRESS': 'in_progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'ON_HOLD': 'on_hold',
    };
    
    const domainStatus = statusMap[data.status] || data.status.toLowerCase();
    
    return new Case(
      data.id,
      data.processId,
      data.title,
      data.goalDateUtc,
      domainStatus,
      data.createdBy,
      data.createdAt,
      data.updatedAt,
    );
  }

  private toDomainWithSteps(data: any): Case {
    // データベースのステータス値（大文字）をドメインの値（小文字）に変換
    const statusMap: Record<string, string> = {
      'OPEN': 'open',
      'IN_PROGRESS': 'in_progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'ON_HOLD': 'on_hold',
    };
    
    const domainStatus = statusMap[data.status] || data.status.toLowerCase();
    
    const caseEntity = new Case(
      data.id,
      data.processId,
      data.title,
      data.goalDateUtc,
      domainStatus,
      data.createdBy,
      data.createdAt,
      data.updatedAt,
    );

    const stepInstances = data.stepInstances.map(
      (step: any) =>
        new StepInstance(
          step.id,
          step.caseId,
          step.templateId,
          step.name,
          step.startDateUtc,  // 開始日を追加
          step.dueDateUtc,
          step.assigneeId,
          step.status,
          step.locked,
          step.createdAt,
          step.updatedAt,
        ),
    );

    caseEntity.setStepInstances(stepInstances);
    return caseEntity;
  }
}