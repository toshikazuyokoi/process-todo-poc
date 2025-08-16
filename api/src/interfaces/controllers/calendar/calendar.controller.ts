import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';

interface CalendarEventDto {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  caseId: number;
  caseTitle: string;
  stepId?: number;
  status: string;
  assigneeId?: number | null;
  assigneeName?: string;
  type: 'case' | 'step';
  color?: string;
}

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get calendar events' })
  @ApiResponse({ status: 200, description: 'List of calendar events' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getCalendarEvents(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<CalendarEventDto[]> {
    // すべての案件とステップを取得
    const cases = await this.caseRepository.findAllWithStepInstances();
    const events: CalendarEventDto[] = [];

    // ユーザーIDをパース
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;

    // ユーザー情報を取得（担当者名表示用）
    const users = await this.userRepository.findAll();
    const userMap = new Map(users.map(u => [u.getId(), u.getName()]));

    for (const caseEntity of cases) {
      // ケースのゴール日をイベントとして追加
      if (caseEntity.getGoalDate()) {
        events.push({
          id: `case-${caseEntity.getId()}`,
          title: caseEntity.getTitle(),
          start: caseEntity.getGoalDate().getDate(),
          caseId: caseEntity.getId()!,
          caseTitle: caseEntity.getTitle(),
          status: caseEntity.getStatus().toString(),
          type: 'case',
          color: this.getStatusColor(caseEntity.getStatus().toString()),
        });
      }

      // ステップインスタンスをイベントとして追加
      for (const step of caseEntity.getStepInstances()) {
        // ユーザーフィルタが指定されている場合、担当者でフィルタリング
        if (parsedUserId && step.getAssigneeId() !== parsedUserId) {
          continue;
        }

        // 日付範囲フィルタ
        const startDate = step.getStartDate()?.getDate() || step.getCreatedAt();
        const endDate = step.getDueDate()?.getDate();

        if (from && endDate && new Date(endDate) < new Date(from)) {
          continue;
        }
        if (to && startDate && new Date(startDate) > new Date(to)) {
          continue;
        }

        events.push({
          id: `step-${step.getId()}`,
          title: `${step.getName()} (${caseEntity.getTitle()})`,
          start: startDate,
          end: endDate || undefined,
          caseId: caseEntity.getId()!,
          caseTitle: caseEntity.getTitle(),
          stepId: step.getId()!,
          status: step.getStatus().toString(),
          assigneeId: step.getAssigneeId(),
          assigneeName: step.getAssigneeId() ? userMap.get(step.getAssigneeId()) : undefined,
          type: 'step',
          color: this.getStatusColor(step.getStatus().toString()),
        });
      }
    }

    // 日付でソート
    events.sort((a, b) => {
      const dateA = new Date(a.start).getTime();
      const dateB = new Date(b.start).getTime();
      return dateA - dateB;
    });

    return events;
  }

  private getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'todo': '#9CA3AF',
      'in_progress': '#3B82F6',
      'done': '#10B981',
      'blocked': '#EF4444',
      'cancelled': '#6B7280',
      'open': '#3B82F6',
      'completed': '#10B981',
      'on_hold': '#F59E0B',
    };
    return colorMap[status.toLowerCase()] || '#6B7280';
  }
}