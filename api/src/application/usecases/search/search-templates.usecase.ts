import { Injectable, Inject } from '@nestjs/common';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';

export interface SearchTemplatesDto {
  query?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface TemplateSearchResultDto {
  id: number;
  name: string;
  version: number;
  isActive: boolean;
  stepCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchTemplatesResultDto {
  templates: TemplateSearchResultDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SearchTemplatesUseCase {
  constructor(
    @Inject('IProcessTemplateRepository')
    private readonly templateRepository: IProcessTemplateRepository,
  ) {}

  async execute(dto: SearchTemplatesDto): Promise<SearchTemplatesResultDto> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    // Get all templates
    let templates = await this.templateRepository.findAll();

    // Apply filters
    if (dto.query) {
      const query = dto.query.toLowerCase();
      templates = templates.filter(t => 
        t.getName().toLowerCase().includes(query)
      );
    }

    if (dto.isActive !== undefined) {
      templates = templates.filter(t => t.getIsActive() === dto.isActive);
    }

    // Get total before pagination
    const total = templates.length;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTemplates = templates.slice(startIndex, endIndex);

    // Map to DTOs
    const templateDtos: TemplateSearchResultDto[] = paginatedTemplates.map(t => ({
      id: t.getId()!,
      name: t.getName(),
      version: t.getVersion(),
      isActive: t.getIsActive(),
      stepCount: t.getStepTemplates() ? t.getStepTemplates().length : 0,
      createdAt: t.getCreatedAt(),
      updatedAt: t.getUpdatedAt(),
    }));

    return {
      templates: templateDtos,
      total,
      page,
      limit,
      totalPages,
    };
  }
}