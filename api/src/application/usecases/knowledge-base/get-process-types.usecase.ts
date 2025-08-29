import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  GetProcessTypesQueryDto, 
  ProcessTypesResponseDto 
} from '../../dto/knowledge-base/process-types.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Get Process Types Use Case
 * Retrieves process types from the knowledge base
 */
@Injectable()
export class GetProcessTypesUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Query parameters for filtering process types
   * @returns Process types response with pagination
   */
  async execute(input: GetProcessTypesQueryDto): Promise<ProcessTypesResponseDto> {
    // Validate input
    this.validateInput(input);

    // Get process types from service
    const result = await this.knowledgeBaseManagerService.getProcessTypes({
      category: input.category,
      search: input.search,
      deliverable: input.deliverable,
      hasPhase: input.hasPhase,
      processType: input.processType,
      isActive: input.isActive,
      minConfidence: input.minConfidence,
      limit: input.limit || 20,
      offset: input.offset || 0,
    });

    // Map to response DTO
    return {
      processTypes: result.processTypes,
      total: result.total,
      offset: input.offset || 0,
      limit: input.limit || 20,
      availableCategories: result.availableCategories,
    };
  }

  /**
   * Validate input parameters
   * @param input Query parameters to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: GetProcessTypesQueryDto): void {
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

    // Validate category enum
    if (input.category !== undefined) {
      const validCategories = [
        'development', 'marketing', 'sales', 'operations', 
        'hr', 'finance', 'legal', 'procurement', 
        'manufacturing', 'quality_assurance', 'customer_service', 'research'
      ];
      if (!validCategories.includes(input.category)) {
        throw new DomainException('Invalid category value');
      }
    }

    // Validate search string length
    if (input.search && input.search.length > 200) {
      throw new DomainException('Search query must be less than 200 characters');
    }

    // Validate deliverable string length
    if (input.deliverable && input.deliverable.length > 100) {
      throw new DomainException('Deliverable filter must be less than 100 characters');
    }

    // Validate hasPhase string length
    if (input.hasPhase && input.hasPhase.length > 100) {
      throw new DomainException('Phase filter must be less than 100 characters');
    }
  }
}