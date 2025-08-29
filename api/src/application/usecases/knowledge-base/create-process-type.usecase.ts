import { Injectable } from '@nestjs/common';
import { KnowledgeBaseManagerService } from '../../../domain/services/knowledge-base-manager.service';
import { 
  CreateProcessTypeDto,
  ProcessTypeTemplateDto 
} from '../../dto/knowledge-base/process-types.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

/**
 * Create Process Type Use Case
 * Creates a new process type in the knowledge base
 */
@Injectable()
export class CreateProcessTypeUseCase {
  constructor(
    private readonly knowledgeBaseManagerService: KnowledgeBaseManagerService,
  ) {}

  /**
   * Execute the use case
   * @param input Data for creating a new process type
   * @returns Created process type template
   */
  async execute(input: CreateProcessTypeDto): Promise<ProcessTypeTemplateDto> {
    // Validate input
    this.validateInput(input);

    // Create process type through service
    const created = await this.knowledgeBaseManagerService.createProcessType({
      name: input.name,
      category: input.category,
      phases: input.phases,
      commonDeliverables: input.commonDeliverables,
      riskFactors: input.riskFactors,
    });

    // Return as DTO
    return created;
  }

  /**
   * Validate input parameters
   * @param input Data to validate
   * @throws DomainException if validation fails
   */
  private validateInput(input: CreateProcessTypeDto): void {
    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      throw new DomainException('Process type name is required');
    }

    if (input.name.length > 100) {
      throw new DomainException('Process type name must be less than 100 characters');
    }

    // Validate category
    if (!input.category || input.category.trim().length === 0) {
      throw new DomainException('Process category is required');
    }

    const validCategories = [
      'development', 'marketing', 'sales', 'operations', 
      'hr', 'finance', 'legal', 'procurement', 
      'manufacturing', 'quality_assurance', 'customer_service', 'research'
    ];
    
    if (!validCategories.includes(input.category)) {
      throw new DomainException('Invalid process category');
    }

    // Validate phases
    if (!input.phases || !Array.isArray(input.phases)) {
      throw new DomainException('Process phases must be an array');
    }

    if (input.phases.length === 0) {
      throw new DomainException('At least one phase is required');
    }

    if (input.phases.length > 20) {
      throw new DomainException('Cannot have more than 20 phases');
    }

    for (const phase of input.phases) {
      this.validatePhase(phase);
    }

    // Check for duplicate phase names
    const phaseNames = input.phases.map(p => p.name.toLowerCase());
    const uniqueNames = new Set(phaseNames);
    if (phaseNames.length !== uniqueNames.size) {
      throw new DomainException('Phase names must be unique');
    }

    // Validate common deliverables
    if (!input.commonDeliverables || !Array.isArray(input.commonDeliverables)) {
      throw new DomainException('Common deliverables must be an array');
    }

    if (input.commonDeliverables.length === 0) {
      throw new DomainException('At least one common deliverable is required');
    }

    if (input.commonDeliverables.length > 50) {
      throw new DomainException('Cannot have more than 50 common deliverables');
    }

    for (const deliverable of input.commonDeliverables) {
      if (!deliverable || deliverable.trim().length === 0) {
        throw new DomainException('Common deliverable cannot be empty');
      }
      if (deliverable.length > 200) {
        throw new DomainException('Common deliverable must be less than 200 characters');
      }
    }

    // Validate risk factors if provided
    if (input.riskFactors !== undefined) {
      if (!Array.isArray(input.riskFactors)) {
        throw new DomainException('Risk factors must be an array');
      }

      if (input.riskFactors.length > 30) {
        throw new DomainException('Cannot have more than 30 risk factors');
      }

      for (const riskFactor of input.riskFactors) {
        if (!riskFactor || riskFactor.trim().length === 0) {
          throw new DomainException('Risk factor cannot be empty');
        }
        if (riskFactor.length > 200) {
          throw new DomainException('Risk factor must be less than 200 characters');
        }
      }
    }
  }

  /**
   * Validate a process phase
   * @param phase Phase to validate
   * @throws DomainException if validation fails
   */
  private validatePhase(phase: any): void {
    if (!phase.name || phase.name.trim().length === 0) {
      throw new DomainException('Phase name is required');
    }

    if (phase.name.length > 100) {
      throw new DomainException('Phase name must be less than 100 characters');
    }

    if (!phase.description || phase.description.trim().length === 0) {
      throw new DomainException('Phase description is required');
    }

    if (phase.description.length > 500) {
      throw new DomainException('Phase description must be less than 500 characters');
    }

    if (typeof phase.typicalDuration !== 'number') {
      throw new DomainException('Phase typical duration must be a number');
    }

    if (phase.typicalDuration < 1 || phase.typicalDuration > 2000) {
      throw new DomainException('Phase typical duration must be between 1 and 2000 hours');
    }

    if (!Array.isArray(phase.requiredRoles)) {
      throw new DomainException('Phase required roles must be an array');
    }

    if (phase.requiredRoles.length > 20) {
      throw new DomainException('Phase cannot have more than 20 required roles');
    }

    for (const role of phase.requiredRoles) {
      if (!role || role.trim().length === 0) {
        throw new DomainException('Required role cannot be empty');
      }
      if (role.length > 100) {
        throw new DomainException('Required role must be less than 100 characters');
      }
    }

    if (!Array.isArray(phase.deliverables)) {
      throw new DomainException('Phase deliverables must be an array');
    }

    if (phase.deliverables.length > 20) {
      throw new DomainException('Phase cannot have more than 20 deliverables');
    }

    for (const deliverable of phase.deliverables) {
      if (!deliverable || deliverable.trim().length === 0) {
        throw new DomainException('Phase deliverable cannot be empty');
      }
      if (deliverable.length > 200) {
        throw new DomainException('Phase deliverable must be less than 200 characters');
      }
    }

    if (!Array.isArray(phase.dependencies)) {
      throw new DomainException('Phase dependencies must be an array');
    }

    if (phase.dependencies.length > 10) {
      throw new DomainException('Phase cannot have more than 10 dependencies');
    }

    for (const dependency of phase.dependencies) {
      if (!dependency || dependency.trim().length === 0) {
        throw new DomainException('Phase dependency cannot be empty');
      }
      if (dependency.length > 100) {
        throw new DomainException('Phase dependency must be less than 100 characters');
      }
    }

    if (typeof phase.parallelizable !== 'boolean') {
      throw new DomainException('Phase parallelizable must be a boolean');
    }
  }
}