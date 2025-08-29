import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Delete Process Type Use Case
 * Deletes a process type from the knowledge base
 */
@Injectable()
export class DeleteProcessTypeUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param id Process type ID to delete
   */
  async execute(id: string): Promise<void> {
    // Validate input
    this.validateInput(id);

    // Delete process type through service
    await this.knowledgeBaseManagerService.deleteProcessType(id);
  }

  /**
   * Validate input parameters
   * @param id Process type ID to validate
   * @throws DomainException if validation fails
   */
  private validateInput(id: string): void {
    // Check for null or undefined
    if (id === null || id === undefined) {
      throw new DomainException('Process type ID is required');
    }

    // Check if ID is a string
    if (typeof id !== 'string') {
      throw new DomainException('Process type ID must be a string');
    }

    if (!id || id.trim().length === 0) {
      throw new DomainException('Process type ID is required');
    }

    // Validate ID format (should start with 'proc-' followed by numbers)
    if (!id.match(/^proc-\d+$/)) {
      throw new DomainException('Invalid process type ID format');
    }
  }
}