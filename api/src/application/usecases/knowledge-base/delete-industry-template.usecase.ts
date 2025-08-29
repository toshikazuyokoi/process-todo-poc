import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Delete Industry Template Use Case
 * Deletes an industry template from the knowledge base
 */
@Injectable()
export class DeleteIndustryTemplateUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param id Industry template ID to delete
   */
  async execute(id: string): Promise<void> {
    // Validate input
    this.validateInput(id);

    // Delete industry template through service
    await this.knowledgeBaseManagerService.deleteIndustryTemplate(id);
  }

  /**
   * Validate input parameters
   * @param id Template ID to validate
   * @throws DomainException if validation fails
   */
  private validateInput(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new DomainException('Industry template ID is required');
    }

    // Validate ID format (should start with 'ind-' followed by numbers)
    if (!id.match(/^ind-\d+$/)) {
      throw new DomainException('Invalid industry template ID format');
    }
  }
}