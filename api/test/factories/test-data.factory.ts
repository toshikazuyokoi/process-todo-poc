import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

/**
 * TestDataFactory - テストデータの作成と管理を行うファクトリークラス
 * 
 * 主な機能:
 * - ユニークなプレフィックスの生成
 * - テンプレート、ケース、ステップの作成
 * - テストデータのクリーンアップ
 */
export class TestDataFactory {
  private static counter = 0;

  /**
   * ユニークなプレフィックスを生成
   * テストデータの衝突を防ぐため、タイムスタンプとカウンターを使用
   */
  static getUniquePrefix(): string {
    return `TEST_${Date.now()}_${++this.counter}_`;
  }

  /**
   * ユーザーを作成
   */
  static async createUser(prisma: PrismaService, options?: {
    email?: string;
    name?: string;
    role?: 'admin' | 'member' | 'viewer';
  }) {
    const prefix = this.getUniquePrefix();
    return await prisma.user.create({
      data: {
        email: options?.email || `${prefix}user@example.com`,
        name: options?.name || `${prefix}User`,
        password: 'hashed_password',
        role: options?.role || 'member',
      }
    });
  }

  /**
   * プロセステンプレートを作成
   */
  static async createTemplate(prisma: PrismaService, options?: {
    name?: string;
    stepCount?: number;
    isActive?: boolean;
  }) {
    const prefix = this.getUniquePrefix();
    const name = options?.name || `${prefix}TEMPLATE`;
    const stepCount = options?.stepCount || 1;
    const isActive = options?.isActive !== undefined ? options.isActive : true;

    return await prisma.processTemplate.create({
      data: {
        name,
        isActive,
        stepTemplates: {
          create: Array.from({ length: stepCount }, (_, i) => ({
            seq: i + 1,
            name: `Step ${i + 1}`,
            basis: i === 0 ? 'goal' : 'prev',
            offsetDays: i === 0 ? -10 : 5,
            requiredArtifactsJson: []
          }))
        }
      },
      include: { stepTemplates: true }
    });
  }

  /**
   * ケースを作成
   */
  static async createCase(prisma: PrismaService, options: {
    templateId: number;
    userId: number;
    title?: string;
    goalDate?: Date;
    status?: 'draft' | 'open' | 'in_progress' | 'closed' | 'cancelled';
  }) {
    const prefix = this.getUniquePrefix();
    return await prisma.case.create({
      data: {
        processId: options.templateId,
        title: options.title || `${prefix}CASE`,
        goalDateUtc: options.goalDate || new Date('2025-12-31'),
        status: options.status || 'open',
        createdBy: options.userId,
      }
    });
  }

  /**
   * ステップインスタンスを作成
   */
  static async createStep(prisma: PrismaService, options: {
    caseId: number;
    templateStepId: number;
    name?: string;
    status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
    assigneeId?: number | null;
    dueDate?: Date;
    locked?: boolean;
  }) {
    const prefix = this.getUniquePrefix();
    return await prisma.stepInstance.create({
      data: {
        caseId: options.caseId,
        templateId: options.templateStepId,
        name: options.name || `${prefix}STEP`,
        dueDateUtc: options.dueDate || new Date('2025-12-21'),
        status: options.status || 'todo',
        locked: options.locked !== undefined ? options.locked : false,
        assigneeId: options.assigneeId || null,
      }
    });
  }

  /**
   * コメントを作成
   */
  static async createComment(prisma: PrismaService, options: {
    stepId: number;
    userId: number;
    content: string;
    parentId?: number | null;
  }) {
    return await prisma.comment.create({
      data: {
        stepId: options.stepId,
        userId: options.userId,
        content: options.content,
        parentId: options.parentId || null,
      }
    });
  }

  /**
   * 完全なテストセットアップを作成
   * テンプレート、ケース、ステップを一度に作成
   */
  static async createCompleteSetup(prisma: PrismaService, options?: {
    userEmail?: string;
    templateName?: string;
    caseName?: string;
    stepCount?: number;
  }) {
    const prefix = this.getUniquePrefix();
    
    // ユーザー作成
    const user = await this.createUser(prisma, {
      email: options?.userEmail || `${prefix}owner@example.com`,
      name: `${prefix}Owner`,
      role: 'admin'
    });

    // テンプレート作成
    const template = await this.createTemplate(prisma, {
      name: options?.templateName || `${prefix}TEMPLATE`,
      stepCount: options?.stepCount || 3
    });

    // ケース作成
    const testCase = await this.createCase(prisma, {
      templateId: template.id,
      userId: user.id,
      title: options?.caseName || `${prefix}CASE`
    });

    // ステップインスタンス作成
    const steps = [];
    for (const stepTemplate of template.stepTemplates) {
      const step = await this.createStep(prisma, {
        caseId: testCase.id,
        templateStepId: stepTemplate.id,
        name: `${prefix}STEP_${stepTemplate.seq}`
      });
      steps.push(step);
    }

    return {
      user,
      template,
      case: testCase,
      steps,
      prefix
    };
  }

  /**
   * プレフィックスベースのクリーンアップ
   * 指定されたプレフィックスを含むすべてのテストデータを削除
   */
  static async cleanup(prisma: PrismaService, prefix: string) {
    // 削除は逆順で実行（外部キー制約を考慮）
    
    // コメント削除（stepInstancesに依存）
    await prisma.comment.deleteMany({
      where: { content: { contains: prefix } }
    });

    // 通知削除（独立）
    await prisma.notification.deleteMany({
      where: { message: { contains: prefix } }
    });

    // アーティファクト削除（stepInstancesに依存）
    await prisma.artifact.deleteMany({
      where: { fileName: { contains: prefix } }
    });

    // ケースに関連するステップインスタンスを先に削除
    // 重要: caseIdでの削除を追加
    const casesToDelete = await prisma.case.findMany({
      where: { title: { contains: prefix } },
      select: { id: true }
    });
    
    if (casesToDelete.length > 0) {
      await prisma.stepInstance.deleteMany({
        where: { caseId: { in: casesToDelete.map(c => c.id) } }
      });
    }
    
    // name検索での削除も実行（念のため）
    await prisma.stepInstance.deleteMany({
      where: { name: { contains: prefix } }
    });

    // ケース削除（stepInstancesが削除済みなので安全）
    await prisma.case.deleteMany({
      where: { title: { contains: prefix } }
    });

    // ステップテンプレート削除（テンプレート経由）
    const templates = await prisma.processTemplate.findMany({
      where: { name: { contains: prefix } },
      select: { id: true }
    });
    
    if (templates.length > 0) {
      await prisma.stepTemplate.deleteMany({
        where: { processId: { in: templates.map(t => t.id) } }
      });
      
      // プロセステンプレート削除
      await prisma.processTemplate.deleteMany({
        where: { id: { in: templates.map(t => t.id) } }
      });
    }

    // ユーザー削除
    await prisma.user.deleteMany({
      where: { 
        OR: [
          { email: { contains: prefix } },
          { name: { contains: prefix } }
        ]
      }
    });
  }

  /**
   * すべてのテストデータを削除（危険：本番環境では使用禁止）
   */
  static async cleanupAll(prisma: PrismaService) {
    // TEST_で始まるすべてのデータを削除
    await this.cleanup(prisma, 'TEST_');
  }
}