import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  CreateIndustryTemplateDto,
  IndustryTemplateDto 
} from '../../dto/knowledge-base/industry-templates.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Create Industry Template Use Case
 * Creates a new industry template in the knowledge base
 */
@Injectable()
export class CreateIndustryTemplateUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Data for creating a new industry template
   * @returns Created industry template
   */
  async execute(input: CreateIndustryTemplateDto): Promise<IndustryTemplateDto> {
    // Validate input
    this.validateInput(input);

    // Create industry template through service
    const created = await this.knowledgeBaseManagerService.createIndustryTemplate({
      name: input.name,
      commonProcesses: input.commonProcesses,
      typicalStakeholders: input.typicalStakeholders,
      regulatoryRequirements: input.regulatoryRequirements,
      standardDurations: input.standardDurations,
    });

    // Return as DTO
    return created;
  }

  /**
   * Validate input parameters
   * @param input Data to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: CreateIndustryTemplateDto): void {
    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      throw new DomainException('Industry template name is required');
    }

    if (input.name.length > 100) {
      throw new DomainException('Industry template name must be less than 100 characters');
    }

    // Validate common processes
    if (!input.commonProcesses || !Array.isArray(input.commonProcesses)) {
      throw new DomainException('Common processes must be an array');
    }

    if (input.commonProcesses.length === 0) {
      throw new DomainException('At least one common process is required');
    }

    if (input.commonProcesses.length > 50) {
      throw new DomainException('Cannot have more than 50 common processes');
    }

    for (const process of input.commonProcesses) {
      if (!process || process.trim().length === 0) {
        throw new DomainException('Common process cannot be empty');
      }
      if (process.length > 200) {
        throw new DomainException('Common process must be less than 200 characters');
      }
    }

    // Validate typical stakeholders
    if (!input.typicalStakeholders || !Array.isArray(input.typicalStakeholders)) {
      throw new DomainException('Typical stakeholders must be an array');
    }

    if (input.typicalStakeholders.length === 0) {
      throw new DomainException('At least one typical stakeholder is required');
    }

    if (input.typicalStakeholders.length > 30) {
      throw new DomainException('Cannot have more than 30 typical stakeholders');
    }

    for (const stakeholder of input.typicalStakeholders) {
      if (!stakeholder || stakeholder.trim().length === 0) {
        throw new DomainException('Typical stakeholder cannot be empty');
      }
      if (stakeholder.length > 100) {
        throw new DomainException('Typical stakeholder must be less than 100 characters');
      }
    }

    // Validate regulatory requirements
    if (!input.regulatoryRequirements || !Array.isArray(input.regulatoryRequirements)) {
      throw new DomainException('Regulatory requirements must be an array');
    }

    if (input.regulatoryRequirements.length > 50) {
      throw new DomainException('Cannot have more than 50 regulatory requirements');
    }

    for (const requirement of input.regulatoryRequirements) {
      if (requirement && requirement.length > 200) {
        throw new DomainException('Regulatory requirement must be less than 200 characters');
      }
    }

    // Validate standard durations if provided
    if (input.standardDurations) {
      if (typeof input.standardDurations !== 'object') {
        throw new DomainException('Standard durations must be an object');
      }

      const keys = Object.keys(input.standardDurations);
      if (keys.length > 100) {
        throw new DomainException('Cannot have more than 100 standard durations');
      }

      for (const key of keys) {
        const value = input.standardDurations[key];
        if (typeof value !== 'number' || value < 0 || value > 10000) {
          throw new DomainException('Standard duration must be a number between 0 and 10000');
        }
      }
    }
  }
}