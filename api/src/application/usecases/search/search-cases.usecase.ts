import { Injectable, Inject } from '@nestjs/common';
import { ICaseRepository } from '@domain/repositories/case.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { Case } from '@domain/entities/case';

export interface SearchCasesDto {
  query?: string;
  status?: string[];
  page?: number;
  limit?: number;
}

export interface SearchResultDto {
  cases: CaseSearchResultDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CaseSearchResultDto {
  id: number;
  title: string;
  status: string;
  createdById: number | null;
  createdByName: string;
  goalDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SearchCasesUseCase {
  constructor(
    @Inject('ICaseRepository')
    private readonly caseRepository: ICaseRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: SearchCasesDto): Promise<SearchResultDto> {
    // Set defaults
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    // Get all cases
    let cases = await this.caseRepository.findAll();

    // Apply filters
    if (dto.query) {
      const query = dto.query.toLowerCase();
      cases = cases.filter(c => 
        c.getTitle().toLowerCase().includes(query)
      );
    }

    if (dto.status && dto.status.length > 0) {
      cases = cases.filter(c => dto.status!.includes(c.getStatus().toString()));
    }

    // Get total before pagination
    const total = cases.length;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCases = cases.slice(startIndex, endIndex);

    // Get user information
    const userIds = [...new Set(paginatedCases.map(c => c.getCreatedBy()).filter(id => id !== null))];
    const users = await Promise.all(
      userIds.map(id => this.userRepository.findById(id!))
    );
    const userMap = new Map<number, string>();
    users.forEach(u => {
      if (u && u.getId() !== null) {
        userMap.set(u.getId() as number, u.getName());
      }
    });

    // Map to DTOs
    const caseDtos: CaseSearchResultDto[] = paginatedCases.map(c => ({
      id: c.getId()!,
      title: c.getTitle(),
      status: c.getStatus().toString(),
      createdById: c.getCreatedBy(),
      createdByName: c.getCreatedBy() ? userMap.get(c.getCreatedBy()!) || 'Unknown' : 'Unknown',
      goalDate: c.getGoalDate().getDate(),
      createdAt: c.getCreatedAt(),
      updatedAt: c.getUpdatedAt(),
    }));

    return {
      cases: caseDtos,
      total,
      page,
      limit,
      totalPages,
    };
  }
}