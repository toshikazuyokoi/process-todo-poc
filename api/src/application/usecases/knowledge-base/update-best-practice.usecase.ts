import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  UpdateBestPracticeDto,
  BestPracticeDto 
} from '../../dto/knowledge-base/best-practices.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Update Best Practice Use Case
 * Updates an existing best practice in the knowledge base
 */
@Injectable()
export class UpdateBestPracticeUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param id Best practice ID to update
   * @param input Update data
   * @returns Updated best practice
   */
  async execute(id: string, input: UpdateBestPracticeDto): Promise<BestPracticeDto> {
    // Validate input
    this.validateInput(id, input);

    // Update best practice through service
    const updated = await this.knowledgeBaseManagerService.updateBestPractice(id, {
      title: input.title,
      description: input.description,
      category: input.category,
      tags: input.tags,
      confidence: input.confidence,
    });

    // Return as DTO
    return updated;
  }

  /**
   * Validate input parameters
   * @param id Best practice ID to validate
   * @param input Update data to validate
   * @throws DomainException if validation fails
   */
  private validateInput(id: string, input: UpdateBestPracticeDto): void {
    // Validate ID
    if (!id || id.trim().length === 0) {
      throw new DomainException('Best practice ID is required');
    }

    // Check if at least one field is being updated
    if (!input.title && 
        !input.description &&
        !input.category &&
        !input.tags && 
        input.confidence === undefined) {
      throw new DomainException('At least one field must be provided for update');
    }

    // Validate title if provided
    if (input.title !== undefined) {
      if (input.title.trim().length === 0) {
        throw new DomainException('Best practice title cannot be empty');
      }
      if (input.title.length > 200) {
        throw new DomainException('Best practice title must be less than 200 characters');
      }
    }

    // Validate description if provided
    if (input.description !== undefined) {
      if (input.description.trim().length === 0) {
        throw new DomainException('Best practice description cannot be empty');
      }
      if (input.description.length > 1000) {
        throw new DomainException('Best practice description must be less than 1000 characters');
      }
    }

    // Validate category if provided
    if (input.category !== undefined) {
      const validCategories = [
        'quality', 'efficiency', 'risk_management', 'compliance', 
        'collaboration', 'documentation', 'automation', 'security',
        'performance', 'scalability', 'maintenance', 'testing'
      ];
      
      if (!validCategories.includes(input.category)) {
        throw new DomainException('Invalid best practice category');
      }
    }


    // Validate tags if provided
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags)) {
        throw new DomainException('Tags must be an array');
      }

      if (input.tags.length > 20) {
        throw new DomainException('Cannot have more than 20 tags');
      }

      for (const tag of input.tags) {
        if (tag && tag.length > 50) {
          throw new DomainException('Tag must be less than 50 characters');
        }
      }
    }

    // Validate confidence score if provided
    if (input.confidence !== undefined) {
      if (typeof input.confidence !== 'number') {
        throw new DomainException('Confidence score must be a number');
      }

      if (input.confidence < 0 || input.confidence > 1) {
        throw new DomainException('Confidence score must be between 0 and 1');
      }
    }

  }
}