import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';

export interface GanttTaskDto {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'case' | 'step';
  dependencies?: string[];
  assignee?: string;
  status: string;
  parentId?: string;
}

export interface GanttDataDto {
  tasks: GanttTaskDto[];
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class GetGanttDataUseCase {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(caseId?: number): Promise<GanttDataDto> {
    if (caseId) {
      return await this.getGanttDataForCase(caseId);
    } else {
      return await this.getGanttDataForAllCases();
    }
  }

  private async getGanttDataForCase(caseId: number): Promise<GanttDataDto> {
    // Get case
    const caseEntity = await this.caseRepository.findById(caseId);
    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Get steps
    const steps = await this.stepRepository.findByCaseId(caseId);

    // Get all assignees
    const assigneeIds = [...new Set(steps.map(s => s.getAssigneeId()).filter(id => id !== null))];
    const users = await Promise.all(
      assigneeIds.map(id => this.userRepository.findById(id!))
    );
    const userMap = new Map<number, string>();
    users.forEach(u => {
      if (u && u.getId() !== null) {
        userMap.set(u.getId() as number, u.getName());
      }
    });

    // Create tasks
    const tasks: GanttTaskDto[] = [];

    // Add case as parent task
    const caseTask: GanttTaskDto = {
      id: `case-${caseEntity.getId()}`,
      name: caseEntity.getTitle(),
      start: caseEntity.getCreatedAt(),
      end: caseEntity.getGoalDate().getDate(),
      progress: this.calculateCaseProgress(steps),
      type: 'case',
      status: caseEntity.getStatus().toString(),
    };
    tasks.push(caseTask);

    // Add steps as child tasks
    const stepTasks = steps.map(step => {
      const task: GanttTaskDto = {
        id: `step-${step.getId()}`,
        name: step.getName(),
        start: step.getCreatedAt(),
        end: step.getDueDate() ? step.getDueDate()!.getDate() : new Date(),
        progress: this.calculateStepProgress(step.getStatus().toString()),
        type: 'step',
        parentId: `case-${caseEntity.getId()}`,
        status: step.getStatus().toString(),
        assignee: step.getAssigneeId() ? userMap.get(step.getAssigneeId()!) : undefined,
      };

      return task;
    });

    tasks.push(...stepTasks);

    // Calculate date range
    const allDates = [
      ...tasks.map(t => t.start),
      ...tasks.map(t => t.end),
    ];
    const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    return {
      tasks,
      startDate,
      endDate,
    };
  }

  private async getGanttDataForAllCases(): Promise<GanttDataDto> {
    // Get all cases
    const cases = await this.caseRepository.findAll();
    
    const tasks: GanttTaskDto[] = [];
    const allDates: Date[] = [];

    for (const caseEntity of cases) {
      // Get steps for each case
      const steps = await this.stepRepository.findByCaseId(caseEntity.getId()!);

      // Get assignees
      const assigneeIds = [...new Set(steps.map(s => s.getAssigneeId()).filter(id => id !== null))];
      const users = await Promise.all(
        assigneeIds.map(id => this.userRepository.findById(id!))
      );
      const userMap = new Map<number, string>();
      users.forEach(u => {
        if (u && u.getId() !== null) {
          userMap.set(u.getId() as number, u.getName());
        }
      });

      // Add case task
      const caseTask: GanttTaskDto = {
        id: `case-${caseEntity.getId()}`,
        name: caseEntity.getTitle(),
        start: caseEntity.getCreatedAt(),
        end: caseEntity.getGoalDate().getDate(),
        progress: this.calculateCaseProgress(steps),
        type: 'case',
        status: caseEntity.getStatus().toString(),
      };
      tasks.push(caseTask);
      allDates.push(caseTask.start, caseTask.end);

      // Add step tasks
      const stepTasks = steps.map(step => {
        const task: GanttTaskDto = {
          id: `step-${step.getId()}`,
          name: `${caseEntity.getTitle()} - ${step.getName()}`,
          start: step.getCreatedAt(),
          end: step.getDueDate() ? step.getDueDate()!.getDate() : new Date(),
          progress: this.calculateStepProgress(step.getStatus().toString()),
          type: 'step',
          parentId: `case-${caseEntity.getId()}`,
          status: step.getStatus().toString(),
          assignee: step.getAssigneeId() ? userMap.get(step.getAssigneeId()!) : undefined,
        };

        allDates.push(task.start, task.end);
        return task;
      });

      tasks.push(...stepTasks);
    }

    // Calculate date range
    const startDate = allDates.length > 0 
      ? new Date(Math.min(...allDates.map(d => d.getTime())))
      : new Date();
    const endDate = allDates.length > 0
      ? new Date(Math.max(...allDates.map(d => d.getTime())))
      : new Date();

    return {
      tasks,
      startDate,
      endDate,
    };
  }

  private calculateStepProgress(status: string): number {
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      case 'todo':
      default:
        return 0;
    }
  }

  private calculateCaseProgress(steps: any[]): number {
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(s => s.getStatus().toString() === 'completed').length;
    return Math.round((completedSteps / steps.length) * 100);
  }
}