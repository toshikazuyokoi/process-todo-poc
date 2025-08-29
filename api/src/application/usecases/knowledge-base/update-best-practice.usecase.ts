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
      applicableProcessTypes: input.applicableProcessTypes,
      tags: input.tags,
      confidenceScore: input.confidenceScore,
      expectedImpact: input.expectedImpact,
      implementationGuidelines: input.implementationGuidelines,
      prerequisites: input.prerequisites,
      risks: input.risks,
      metrics: input.metrics,
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
        !input.applicableProcessTypes && 
        !input.tags && 
        input.confidenceScore === undefined &&
        !input.expectedImpact &&
        !input.implementationGuidelines &&
        !input.prerequisites &&
        !input.risks &&
        !input.metrics) {
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

    // Validate applicable process types if provided
    if (input.applicableProcessTypes !== undefined) {
      if (!Array.isArray(input.applicableProcessTypes)) {
        throw new DomainException('Applicable process types must be an array');
      }

      if (input.applicableProcessTypes.length === 0) {
        throw new DomainException('At least one applicable process type is required');
      }

      if (input.applicableProcessTypes.length > 50) {
        throw new DomainException('Cannot have more than 50 applicable process types');
      }

      for (const processType of input.applicableProcessTypes) {
        if (!processType || processType.trim().length === 0) {
          throw new DomainException('Applicable process type cannot be empty');
        }
        if (processType.length > 100) {
          throw new DomainException('Applicable process type must be less than 100 characters');
        }
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
    if (input.confidenceScore !== undefined) {
      if (typeof input.confidenceScore !== 'number') {
        throw new DomainException('Confidence score must be a number');
      }

      if (input.confidenceScore < 0 || input.confidenceScore > 1) {
        throw new DomainException('Confidence score must be between 0 and 1');
      }
    }

    // Validate expected impact if provided
    if (input.expectedImpact !== undefined) {
      if (input.expectedImpact.length > 500) {
        throw new DomainException('Expected impact must be less than 500 characters');
      }
    }

    // Validate implementation guidelines if provided
    if (input.implementationGuidelines !== undefined) {
      if (!Array.isArray(input.implementationGuidelines)) {
        throw new DomainException('Implementation guidelines must be an array');
      }

      if (input.implementationGuidelines.length === 0) {
        throw new DomainException('At least one implementation guideline is required');
      }

      if (input.implementationGuidelines.length > 20) {
        throw new DomainException('Cannot have more than 20 implementation guidelines');
      }

      for (const guideline of input.implementationGuidelines) {
        if (!guideline || guideline.trim().length === 0) {
          throw new DomainException('Implementation guideline cannot be empty');
        }
        if (guideline.length > 500) {
          throw new DomainException('Implementation guideline must be less than 500 characters');
        }
      }
    }

    // Validate prerequisites if provided
    if (input.prerequisites !== undefined) {
      if (!Array.isArray(input.prerequisites)) {
        throw new DomainException('Prerequisites must be an array');
      }

      if (input.prerequisites.length > 10) {
        throw new DomainException('Cannot have more than 10 prerequisites');
      }

      for (const prerequisite of input.prerequisites) {
        if (prerequisite && prerequisite.length > 200) {
          throw new DomainException('Prerequisite must be less than 200 characters');
        }
      }
    }

    // Validate risks if provided
    if (input.risks !== undefined) {
      if (!Array.isArray(input.risks)) {
        throw new DomainException('Risks must be an array');
      }

      if (input.risks.length > 10) {
        throw new DomainException('Cannot have more than 10 risks');
      }

      for (const risk of input.risks) {
        if (risk && risk.length > 200) {
          throw new DomainException('Risk must be less than 200 characters');
        }
      }
    }

    // Validate metrics if provided
    if (input.metrics !== undefined) {
      if (!Array.isArray(input.metrics)) {
        throw new DomainException('Metrics must be an array');
      }

      if (input.metrics.length > 10) {
        throw new DomainException('Cannot have more than 10 metrics');
      }

      for (const metric of input.metrics) {
        if (metric && metric.length > 200) {
          throw new DomainException('Metric must be less than 200 characters');
        }
      }
    }
  }
}