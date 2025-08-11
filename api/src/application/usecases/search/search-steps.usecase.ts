import { Injectable, Inject } from '@nestjs/common';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepInstance } from '@domain/entities/step-instance';

export interface SearchStepsDto {
  query?: string;
  caseId?: number;
  status?: string[];
  assigneeId?: number;
  page?: number;
  limit?: number;
}

export interface StepSearchResultDto {
  id: number;
  name: string;
  description: string | null;
  status: string;
  assigneeId: number | null;
  assigneeName: string | null;
  caseId: number;
  caseName: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepSearchResultsDto {
  steps: StepSearchResultDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SearchStepsUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: SearchStepsDto): Promise<StepSearchResultsDto> {
    // Set defaults
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    // Get steps
    let steps: StepInstance[];
    if (dto.caseId) {
      steps = await this.stepRepository.findByCaseId(dto.caseId);
    } else {
      // Get all steps by fetching from all cases
      const cases = await this.caseRepository.findAll();
      const allSteps: StepInstance[] = [];
      for (const c of cases) {
        const caseSteps = await this.stepRepository.findByCaseId(c.getId()!);
        allSteps.push(...caseSteps);
      }
      steps = allSteps;
    }

    // Apply filters
    if (dto.query) {
      const query = dto.query.toLowerCase();
      steps = steps.filter(s => 
        s.getName().toLowerCase().includes(query)
      );
    }

    if (dto.status && dto.status.length > 0) {
      steps = steps.filter(s => dto.status!.includes(s.getStatus().toString()));
    }

    if (dto.assigneeId) {
      steps = steps.filter(s => s.getAssigneeId() === dto.assigneeId);
    }

    // Get total before pagination
    const total = steps.length;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSteps = steps.slice(startIndex, endIndex);

    // Get case and user information
    const caseIds = [...new Set(paginatedSteps.map(s => s.getCaseId()))];
    const cases = await Promise.all(
      caseIds.map(id => this.caseRepository.findById(id))
    );
    const caseMap = new Map<number, string>();
    cases.forEach(c => {
      if (c && c.getId() !== null) {
        caseMap.set(c.getId() as number, c.getTitle());
      }
    });

    const assigneeIds = [...new Set(paginatedSteps.map(s => s.getAssigneeId()).filter(id => id !== null))];
    const users = await Promise.all(
      assigneeIds.map(id => this.userRepository.findById(id!))
    );
    const userMap = new Map<number, string>();
    users.forEach(u => {
      if (u && u.getId() !== null) {
        userMap.set(u.getId() as number, u.getName());
      }
    });

    // Map to DTOs
    const stepDtos: StepSearchResultDto[] = paginatedSteps.map(s => ({
      id: s.getId()!,
      name: s.getName(),
      description: null,
      status: s.getStatus().toString(),
      assigneeId: s.getAssigneeId(),
      assigneeName: s.getAssigneeId() ? userMap.get(s.getAssigneeId()!) || null : null,
      caseId: s.getCaseId(),
      caseName: caseMap.get(s.getCaseId()) || 'Unknown',
      dueDate: s.getDueDate() ? s.getDueDate()!.getDate() : null,
      createdAt: s.getCreatedAt(),
      updatedAt: s.getUpdatedAt(),
    }));

    return {
      steps: stepDtos,
      total,
      page,
      limit,
      totalPages,
    };
  }
}