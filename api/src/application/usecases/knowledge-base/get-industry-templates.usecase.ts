import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  GetIndustryTemplatesQueryDto, 
  IndustryTemplatesResponseDto 
} from '../../dto/knowledge-base/industry-templates.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Get Industry Templates Use Case
 * Retrieves industry templates from the knowledge base
 */
@Injectable()
export class GetIndustryTemplatesUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Query parameters for filtering industry templates
   * @returns Industry templates response with pagination
   */
  async execute(input: GetIndustryTemplatesQueryDto): Promise<IndustryTemplatesResponseDto> {
    // Validate input
    this.validateInput(input);

    // Get industry templates from service
    const result = await this.knowledgeBaseManagerService.getIndustryTemplates({
      industry: input.industry,
      search: input.search,
      regulation: input.regulation,
      process: input.process,
      isActive: input.isActive,
      minConfidence: input.minConfidence,
      limit: input.limit || 20,
      offset: input.offset || 0,
    });

    // Map to response DTO
    return {
      templates: result.templates,
      total: result.total,
      offset: input.offset || 0,
      limit: input.limit || 20,
    };
  }

  /**
   * Validate input parameters
   * @param input Query parameters to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: GetIndustryTemplatesQueryDto): void {
    // Validate limit
    if (input.limit !== undefined) {
      if (input.limit < 1 || input.limit > 100) {
        throw new DomainException('Limit must be between 1 and 100');
      }
    }

    // Validate offset
    if (input.offset !== undefined) {
      if (input.offset < 0) {
        throw new DomainException('Offset must be non-negative');
      }
    }

    // Validate minConfidence
    if (input.minConfidence !== undefined) {
      if (input.minConfidence < 0 || input.minConfidence > 1) {
        throw new DomainException('Minimum confidence must be between 0 and 1');
      }
    }

    // Validate search string length
    if (input.search && input.search.length > 200) {
      throw new DomainException('Search query must be less than 200 characters');
    }

    // Validate regulation string length
    if (input.regulation && input.regulation.length > 100) {
      throw new DomainException('Regulation filter must be less than 100 characters');
    }

    // Validate process string length
    if (input.process && input.process.length > 100) {
      throw new DomainException('Process filter must be less than 100 characters');
    }
  }
}