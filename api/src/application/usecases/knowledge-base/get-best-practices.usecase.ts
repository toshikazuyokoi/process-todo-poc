import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  GetBestPracticesQueryDto, 
  BestPracticesResponseDto 
} from '../../dto/knowledge-base/best-practices.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Get Best Practices Use Case
 * Retrieves best practices from the knowledge base
 */
@Injectable()
export class GetBestPracticesUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Query parameters for filtering best practices
   * @returns Best practices response with pagination
   */
  async execute(input: GetBestPracticesQueryDto): Promise<BestPracticesResponseDto> {
    // Validate input
    this.validateInput(input);

    // Get best practices from service
    const result = await this.knowledgeBaseManagerService.getBestPractices({
      category: input.category,
      applicableProcessTypes: input.applicableProcessTypes,
      search: input.search,
      tags: input.tags,
      isActive: input.isActive,
      confidenceScoreMin: input.confidenceScoreMin,
      limit: input.limit || 20,
      offset: input.offset || 0,
    });

    // Map to response DTO
    return {
      practices: result.practices,
      total: result.total,
      offset: input.offset || 0,
      limit: input.limit || 20,
      availableTags: result.availableTags,
    };
  }

  /**
   * Validate input parameters
   * @param input Query parameters to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: GetBestPracticesQueryDto): void {
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

    // Validate confidenceScoreMin
    if (input.confidenceScoreMin !== undefined) {
      if (input.confidenceScoreMin < 0 || input.confidenceScoreMin > 1) {
        throw new DomainException('Confidence score minimum must be between 0 and 1');
      }
    }

    // Validate category enum
    if (input.category !== undefined) {
      const validCategories = [
        'quality', 'efficiency', 'risk_management', 'compliance', 
        'collaboration', 'documentation', 'automation', 'security',
        'performance', 'scalability', 'maintenance', 'testing'
      ];
      if (!validCategories.includes(input.category)) {
        throw new DomainException('Invalid category value');
      }
    }

    // Validate search string length
    if (input.search && input.search.length > 200) {
      throw new DomainException('Search query must be less than 200 characters');
    }

    // Validate applicable process types array
    if (input.applicableProcessTypes !== undefined) {
      if (!Array.isArray(input.applicableProcessTypes)) {
        throw new DomainException('Applicable process types must be an array');
      }
      if (input.applicableProcessTypes.length > 50) {
        throw new DomainException('Cannot filter by more than 50 process types');
      }
      for (const processType of input.applicableProcessTypes) {
        if (!processType || processType.length > 100) {
          throw new DomainException('Process type must be less than 100 characters');
        }
      }
    }

    // Validate tags array
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags)) {
        throw new DomainException('Tags must be an array');
      }
      if (input.tags.length > 20) {
        throw new DomainException('Cannot filter by more than 20 tags');
      }
      for (const tag of input.tags) {
        if (!tag || tag.length > 50) {
          throw new DomainException('Tag must be less than 50 characters');
        }
      }
    }
  }
}