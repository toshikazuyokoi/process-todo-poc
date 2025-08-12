import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Case } from '../../../domain/entities/case';
import { CaseStatus } from '../../../domain/value-objects/case-status';
import { ICaseRepository } from '../../../domain/repositories/case.repository.interface';

@Injectable()
export class OptimizedCaseRepository implements ICaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  // N+1問題を解決: ステップインスタンスと関連データを一括取得
  async findById(id: number): Promise<Case | null> {
    const data = await this.prisma.case.findUnique({
      where: { id },
      include: {
        stepInstances: {
          include: {
            assignee: true,
            template: true,
            artifacts: true,
          },
        },
        process: {
          include: {
            stepTemplates: true,
          },
        },
        createdByUser: true,
      },
    });

    return data ? this.toDomain(data) : null;
  }

  // N+1問題を解決: 関連データを含めて一括取得
  async findAll(status?: CaseStatus): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: status ? { status } : undefined,
      include: {
        process: true,
        createdByUser: true,
        stepInstances: {
          include: {
            assignee: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map((d) => this.toDomain(d));
  }

  // ダッシュボード用の最適化されたクエリ
  async findForDashboard(userId?: number): Promise<any[]> {
    const data = await this.prisma.case.findMany({
      where: userId ? { createdBy: userId } : undefined,
      select: {
        id: true,
        title: true,
        status: true,
        goalDateUtc: true,
        createdAt: true,
        process: {
          select: {
            id: true,
            name: true,
          },
        },
        stepInstances: {
          select: {
            id: true,
            status: true,
            dueDateUtc: true,
          },
        },
        _count: {
          select: {
            stepInstances: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // ダッシュボードでは最新20件のみ
    });

    return data.map((d) => ({
      ...d,
      totalSteps: d._count.stepInstances,
      completedSteps: d.stepInstances.filter((s) => s.status === 'completed').length,
      progress: d._count.stepInstances > 0
        ? Math.round((d.stepInstances.filter((s) => s.status === 'completed').length / d._count.stepInstances) * 100)
        : 0,
    }));
  }

  // ガントチャート用の最適化されたクエリ
  async findForGantt(startDate: Date, endDate: Date): Promise<any[]> {
    const data = await this.prisma.case.findMany({
      where: {
        OR: [
          {
            goalDateUtc: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            stepInstances: {
              some: {
                dueDateUtc: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        goalDateUtc: true,
        process: {
          select: {
            name: true,
          },
        },
        stepInstances: {
          where: {
            dueDateUtc: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            name: true,
            dueDateUtc: true,
            status: true,
            assignee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            dueDateUtc: 'asc',
          },
        },
      },
    });

    return data;
  }

  // バッチ処理用の最適化
  async findByIdsWithRelations(ids: number[]): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        stepInstances: {
          include: {
            assignee: true,
            artifacts: true,
          },
        },
        process: {
          include: {
            stepTemplates: true,
          },
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByProcessId(processId: number): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: { processId },
      include: {
        stepInstances: true,
        process: true,
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByUserId(userId: number): Promise<Case[]> {
    const data = await this.prisma.case.findMany({
      where: { createdBy: userId },
      include: {
        stepInstances: {
          include: {
            assignee: true,
          },
        },
        process: true,
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async save(caseEntity: Case): Promise<Case> {
    const id = caseEntity.getId();

    if (id) {
      const updated = await this.prisma.case.update({
        where: { id },
        data: {
          title: caseEntity.getTitle(),
          status: caseEntity.getStatus(),
          goalDateUtc: caseEntity.getGoalDateUtc(),
        },
        include: {
          stepInstances: true,
          process: true,
        },
      });
      return this.toDomain(updated);
    } else {
      const created = await this.prisma.case.create({
        data: {
          processId: caseEntity.getProcessId(),
          title: caseEntity.getTitle(),
          goalDateUtc: caseEntity.getGoalDateUtc(),
          status: caseEntity.getStatus(),
          createdBy: caseEntity.getCreatedBy(),
        },
        include: {
          stepInstances: true,
          process: true,
        },
      });
      return this.toDomain(created);
    }
  }

  async delete(id: number): Promise<void> {
    // トランザクション内で関連データも削除
    await this.prisma.$transaction(async (tx) => {
      // まず関連する全データを削除
      await tx.artifact.deleteMany({
        where: {
          step: {
            caseId: id,
          },
        },
      });

      await tx.comment.deleteMany({
        where: {
          step: {
            caseId: id,
          },
        },
      });

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
        stepInstances: {
          include: {
            assignee: true,
            artifacts: true,
            comments: {
              include: {
                user: true,
              },
            },
          },
        },
        process: {
          include: {
            stepTemplates: true,
          },
        },
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async findUpcomingCases(days: number): Promise<Case[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const data = await this.prisma.case.findMany({
      where: {
        goalDateUtc: {
          lte: futureDate,
          gte: new Date(),
        },
        status: {
          not: 'completed',
        },
      },
      include: {
        stepInstances: {
          where: {
            dueDateUtc: {
              lte: futureDate,
              gte: new Date(),
            },
          },
        },
        process: true,
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
          not: 'completed',
        },
      },
      include: {
        stepInstances: {
          where: {
            status: {
              not: 'completed',
            },
          },
        },
        process: true,
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  private toDomain(data: any): Case {
    return new Case(
      data.id,
      data.processId,
      data.title,
      data.goalDateUtc,
      data.status as CaseStatus,
      data.createdBy,
      data.createdAt,
      data.updatedAt,
    );
  }
}