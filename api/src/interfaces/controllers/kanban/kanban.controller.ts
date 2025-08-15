import {
  Controller,
  Get,
  Query,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepStatus } from '@domain/values/step-status';

interface KanbanColumnDto {
  id: string;
  title: string;
  status: string;
  items: KanbanItemDto[];
  wipLimit?: number;
}

interface KanbanItemDto {
  id: number;
  title: string;
  caseId: number;
  caseTitle: string;
  status: string;
  assigneeId?: number | null;
  assigneeName?: string;
  dueDateUtc?: Date | string | null;
  isOverdue: boolean;
  priority?: string;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface KanbanBoardDto {
  columns: KanbanColumnDto[];
  users: Array<{
    id: number;
    name: string;
    email: string;
  }>;
  stats: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
  };
}

@ApiTags('kanban')
@Controller('kanban')
export class KanbanController {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  @Get('board')
  @ApiOperation({ summary: 'Get kanban board data' })
  @ApiResponse({ status: 200, description: 'Kanban board with columns and items' })
  @ApiQuery({ name: 'assigneeId', required: false, type: Number })
  @ApiQuery({ name: 'caseId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, isArray: true })
  async getKanbanBoard(
    @Query('assigneeId') assigneeId?: string,
    @Query('caseId') caseId?: string,
    @Query('status') status?: string | string[],
  ): Promise<KanbanBoardDto> {
    // パラメーターをパース
    const parsedAssigneeId = assigneeId ? parseInt(assigneeId, 10) : undefined;
    const parsedCaseId = caseId ? parseInt(caseId, 10) : undefined;

    // ユーザー一覧を取得
    const users = await this.userRepository.findAll();
    const userMap = new Map(users.map(u => [u.getId(), u.getName()]));

    // ケースとステップを取得
    let cases = await this.caseRepository.findAllWithStepInstances();
    
    // ケースIDでフィルタ
    if (parsedCaseId) {
      cases = cases.filter(c => c.getId() === parsedCaseId);
    }

    // すべてのステップを収集
    const allSteps: KanbanItemDto[] = [];
    
    for (const caseEntity of cases) {
      for (const step of caseEntity.getStepInstances()) {
        // 担当者でフィルタ
        if (parsedAssigneeId && step.getAssigneeId() !== parsedAssigneeId) {
          continue;
        }

        // ステータスでフィルタ
        if (status) {
          const statusFilter = Array.isArray(status) ? status : [status];
          if (!statusFilter.includes(step.getStatus().toString())) {
            continue;
          }
        }

        // 期限超過チェック
        const isOverdue = step.getDueDate() 
          ? new Date(step.getDueDate()!.getDate()) < new Date() && step.getStatus().toString() !== 'done'
          : false;

        allSteps.push({
          id: step.getId()!,
          title: step.getName(),
          caseId: caseEntity.getId()!,
          caseTitle: caseEntity.getTitle(),
          status: step.getStatus().toString(),
          assigneeId: step.getAssigneeId(),
          assigneeName: step.getAssigneeId() ? userMap.get(step.getAssigneeId()) : undefined,
          dueDateUtc: step.getDueDate()?.getDate() || null,
          isOverdue,
          locked: step.isLocked(),
          createdAt: step.getCreatedAt(),
          updatedAt: step.getUpdatedAt(),
        });
      }
    }

    // カラムごとにステップを分類
    const columns: KanbanColumnDto[] = [
      {
        id: 'todo',
        title: '未着手',
        status: 'todo',
        items: allSteps.filter(s => s.status === 'todo'),
        wipLimit: 10,
      },
      {
        id: 'in_progress',
        title: '進行中',
        status: 'in_progress',
        items: allSteps.filter(s => s.status === 'in_progress'),
        wipLimit: 5,
      },
      {
        id: 'review',
        title: 'レビュー',
        status: 'review',
        items: allSteps.filter(s => s.status === 'review'),
        wipLimit: 3,
      },
      {
        id: 'done',
        title: '完了',
        status: 'done',
        items: allSteps.filter(s => s.status === 'done'),
      },
      {
        id: 'blocked',
        title: 'ブロック',
        status: 'blocked',
        items: allSteps.filter(s => s.status === 'blocked'),
      },
    ];

    // 統計情報
    const stats = {
      total: allSteps.length,
      todo: columns.find(c => c.id === 'todo')?.items.length || 0,
      inProgress: columns.find(c => c.id === 'in_progress')?.items.length || 0,
      done: columns.find(c => c.id === 'done')?.items.length || 0,
      blocked: columns.find(c => c.id === 'blocked')?.items.length || 0,
    };

    return {
      columns,
      users: users.map(u => ({
        id: u.getId()!,
        name: u.getName(),
        email: u.getEmail() || '',
      })),
      stats,
    };
  }
}