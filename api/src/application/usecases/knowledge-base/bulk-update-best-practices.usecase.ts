import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  BulkUpdateBestPracticesDto,
  BulkUpdateResultDto 
} from '../../dto/knowledge-base/best-practices.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Bulk Update Best Practices Use Case
 * Updates multiple best practices in the knowledge base
 */
@Injectable()
export class BulkUpdateBestPracticesUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Bulk update data
   * @returns Bulk update result
   */
  async execute(input: BulkUpdateBestPracticesDto): Promise<BulkUpdateResultDto> {
    // Validate input
    this.validateInput(input);

    // Perform bulk update through service
    // Service expects a simple array of { id, confidence }
    await this.knowledgeBaseManagerService.bulkUpdateBestPractices(input.updates);

    // Return result
    // Since the service returns void, we construct the result from input
    return {
      totalUpdated: input.updates.length,
      updatedIds: input.updates.map(u => u.id),
      failures: [],
    };
  }

  /**
   * Validate input parameters
   * @param input Bulk update data to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: BulkUpdateBestPracticesDto): void {
    // Validate updates array
    if (!input.updates || !Array.isArray(input.updates)) {
      throw new DomainException('Updates must be an array');
    }

    if (input.updates.length === 0) {
      throw new DomainException('At least one update is required for bulk update');
    }

    if (input.updates.length > 100) {
      throw new DomainException('Cannot update more than 100 best practices at once');
    }

    // Track unique IDs
    const seenIds = new Set<string>();

    for (const update of input.updates) {
      // Validate ID
      if (!update.id || update.id.trim().length === 0) {
        throw new DomainException('Best practice ID cannot be empty');
      }
      
      // Validate ID format (should start with 'bp-' followed by numbers)
      if (!update.id.match(/^bp-\d+$/)) {
        throw new DomainException('Invalid best practice ID format');
      }

      // Check for duplicate IDs
      if (seenIds.has(update.id)) {
        throw new DomainException('Duplicate IDs are not allowed');
      }
      seenIds.add(update.id);

      // Validate confidence score
      if (typeof update.confidence !== 'number') {
        throw new DomainException('Confidence score must be a number');
      }

      if (update.confidence < 0 || update.confidence > 1) {
        throw new DomainException('Confidence score must be between 0 and 1');
      }
    }
  }
}