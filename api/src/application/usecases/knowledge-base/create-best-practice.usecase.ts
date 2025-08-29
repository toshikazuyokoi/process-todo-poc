import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  CreateBestPracticeDto,
  BestPracticeDto 
} from '../../dto/knowledge-base/best-practices.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Create Best Practice Use Case
 * Creates a new best practice in the knowledge base
 */
@Injectable()
export class CreateBestPracticeUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Data for creating a new best practice
   * @returns Created best practice
   */
  async execute(input: CreateBestPracticeDto): Promise<BestPracticeDto> {
    // Validate input
    this.validateInput(input);

    // Create best practice through service
    const created = await this.knowledgeBaseManagerService.createBestPractice({
      title: input.title,
      description: input.description,
      category: input.category,
      industry: input.industry,
      processType: input.processType,
      tags: input.tags,
      confidence: input.confidence,
      source: input.source,
      url: input.url,
    });

    // Return as DTO
    return created;
  }

  /**
   * Validate input parameters
   * @param input Data to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: CreateBestPracticeDto): void {
    // Validate title
    if (!input.title || input.title.trim().length === 0) {
      throw new DomainException('Best practice title is required');
    }

    if (input.title.length > 200) {
      throw new DomainException('Best practice title must be less than 200 characters');
    }

    // Validate description
    if (!input.description || input.description.trim().length === 0) {
      throw new DomainException('Best practice description is required');
    }

    if (input.description.length > 1000) {
      throw new DomainException('Best practice description must be less than 1000 characters');
    }

    // Validate category
    if (!input.category || input.category.trim().length === 0) {
      throw new DomainException('Best practice category is required');
    }

    const validCategories = [
      'methodology', 'tool', 'process', 'governance', 'quality'
    ];
    
    if (!validCategories.includes(input.category)) {
      throw new DomainException('Invalid best practice category');
    }

    // Validate tags
    if (!input.tags || !Array.isArray(input.tags)) {
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

    // Validate confidence score
    if (typeof input.confidence !== 'number') {
      throw new DomainException('Confidence score must be a number');
    }

    if (input.confidence < 0 || input.confidence > 1) {
      throw new DomainException('Confidence score must be between 0 and 1');
    }

    // Validate source
    if (!input.source || input.source.trim().length === 0) {
      throw new DomainException('Source is required');
    }

    if (input.source.length > 200) {
      throw new DomainException('Source must be less than 200 characters');
    }

    // Validate URL if provided
    if (input.url) {
      // Check length first
      if (input.url.length >= 500) {
        throw new DomainException('URL must be less than 500 characters');
      }
      // Then validate URL format
      try {
        new URL(input.url);
      } catch (error) {
        throw new DomainException('Invalid URL format');
      }
    }

    // Validate industry if provided
    if (input.industry && input.industry.length > 100) {
      throw new DomainException('Industry must be less than 100 characters');
    }

    // Validate processType if provided
    if (input.processType && input.processType.length > 100) {
      throw new DomainException('Process type must be less than 100 characters');
    }
  }
}