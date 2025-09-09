import { Injectable, Logger, Inject } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { TemplateGenerationHistoryRepository, TemplateGenerationHistory } from '../../../domain/ai-agent/repositories/template-generation-history.repository.interface';
import { TemplateRecommendationService } from '../../../domain/ai-agent/services/template-recommendation.service';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { TemplateDraftMapper } from '../../services/ai-agent/template-draft-mapper.service';
import { CreateProcessTemplateUseCase } from '../../usecases/process-template/create-process-template.usecase';
import { v4 as uuidv4 } from 'uuid';

// Input/Output types as per design
export interface FinalizeTemplateInput {
  sessionId: string;
  userId: number;
  templateId: string;
  modifications?: any;
  notes?: string;
}

export interface FinalizeTemplateOutput {
  templateId: string;
  sessionId: string;
  name: string;
  description: string;
  steps: any[];
  metadata: Record<string, any>;
  createdAt: Date;
  status: 'draft' | 'finalized';
}

/**
 * Finalize Template Creation Use Case
 * As per ai_agent_class_diagram.md specification
 */
@Injectable()
export class FinalizeTemplateCreationUseCase {
  private readonly logger = new Logger(FinalizeTemplateCreationUseCase.name);

  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    @Inject('TemplateGenerationHistoryRepository')
    private readonly historyRepository: TemplateGenerationHistoryRepository,
    private readonly templateService: TemplateRecommendationService,
    private readonly draftMapper: TemplateDraftMapper,
    private readonly createTemplateUseCase: CreateProcessTemplateUseCase,
  ) {}

  /**
   * Execute template finalization
   * Design: FinalizeTemplateCreationUseCase.execute()
   */
  async execute(input: FinalizeTemplateInput): Promise<FinalizeTemplateOutput> {
    this.logger.log(`Finalizing template ${input.templateId} for session ${input.sessionId}`);

    try {
      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Load session
      const session = await this.loadSession(input.sessionId);

      // Step 3: Validate session ownership
      if (session.getUserId() !== input.userId) {
        throw new DomainException('Unauthorized: Session does not belong to user');
      }

      // Step 4: Get generated template from session
      const generatedTemplate = session.getGeneratedTemplate();
      if (!generatedTemplate) {
        throw new DomainException('No template has been generated for this session');
      }

      // Step 5: Apply modifications (limited: name/description only for PR3)
      let draftToUse = { ...generatedTemplate };
      if (input.modifications) {
        if (input.modifications.name) draftToUse.name = input.modifications.name;
        if (input.modifications.description) draftToUse.description = input.modifications.description;
        if (Array.isArray(input.modifications.steps)) {
          const byId = new Map<string, any>();
          const baseSteps = Array.isArray(draftToUse.steps) ? draftToUse.steps.slice() : [];
          for (const s of baseSteps) {
            if (s && typeof s.id === 'string') byId.set(s.id, { ...s });
          }
          for (const m of input.modifications.steps) {
            if (m && typeof m.id === 'string' && byId.has(m.id)) {
              const current = byId.get(m.id);
              byId.set(m.id, {
                ...current,
                ...m,
              });
            } else if (m) {
              // new step
              byId.set(m.id || `new-${byId.size + 1}`, { ...m });
            }
          }
          draftToUse.steps = Array.from(byId.values());
        }
      }

      // Step 6: Validate and optimize before creating the actual template
      const validationResult = await this.templateService.validateRecommendations([draftToUse]);
      if (!validationResult.valid) {
        this.logger.warn('Template validation failed', validationResult.errors);
        throw new DomainException(`Template validation failed: ${validationResult.errors.join(', ')}`);
      }
      draftToUse.steps = await this.templateService.optimizeStepSequence(draftToUse.steps);

      // Step 7: Map Draft -> Create DTO and create actual process template
      const createDto = this.draftMapper.toCreateDtoFromDraft(draftToUse);
      const created = await this.createTemplateUseCase.execute(createDto);

      // Step 8: Save history and mark as used
      const historyEntry: TemplateGenerationHistory = {
        sessionId: input.sessionId,
        userId: input.userId,
        generatedTemplate: draftToUse,
        requirementsUsed: [],
        confidenceScore: draftToUse.confidence || 0.7,
        wasUsed: true,
        modifications: input.modifications ? [input.modifications] : [],
        createdAt: new Date(),
        finalizedAt: new Date(),
        processTemplateId: created.id,
      };
      await this.historyRepository.save(historyEntry);

      // Step 8: Update session status
      await this.sessionRepository.markAsCompleted(input.sessionId);

      // Return finalized template (align with FinalizeTemplateResponseDto shape)
      return {
        templateId: input.templateId,
        sessionId: input.sessionId,
        name: draftToUse.name,
        description: draftToUse.description || draftToUse.name,
        steps: draftToUse.steps,
        metadata: {
          version: '1.0',
          createdBy: 'AI Agent',
          notes: input.notes,
        },
        createdAt: new Date(),
        status: 'finalized',
      };

    } catch (error) {
      this.logger.error(
        `Failed to finalize template ${input.templateId} for session ${input.sessionId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate input
   * Design: FinalizeTemplateCreationUseCase.validateInput()
   */
  private validateInput(input: FinalizeTemplateInput): void {
    if (!input.sessionId) {
      throw new DomainException('Session ID is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
    if (!input.templateId) {
      throw new DomainException('Template ID is required');
    }
  }

  /**
   * Load session from repository
   * Design: FinalizeTemplateCreationUseCase.loadSession()
   */
  private async loadSession(sessionId: string): Promise<any> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new DomainException(`Session not found: ${sessionId}`);
    }
    return session;
  }

  /**
   * Apply user modifications to template
   * Design: FinalizeTemplateCreationUseCase.applyModifications()
   */
  private async applyModifications(
    template: any,
    modifications: any,
  ): Promise<any> {
    this.logger.log('Applying user modifications to template');

    const modified = { ...template };

    // Apply modifications
    if (modifications.name) {
      modified.name = modifications.name;
    }
    if (modifications.description) {
      modified.description = modifications.description;
    }
    if (modifications.steps) {
      // Merge step modifications
      modified.steps = this.mergeSteps(template.steps, modifications.steps);
    }
    if (modifications.estimatedDuration) {
      modified.estimatedDuration = modifications.estimatedDuration;
    }
    if (modifications.complexity) {
      modified.complexity = modifications.complexity;
    }

    return modified;
  }

  /**
   * Merge step modifications
   */
  private mergeSteps(originalSteps: any[], modifiedSteps: any[]): any[] {
    const stepMap = new Map(originalSteps.map(s => [s.id, s]));
    
    // Apply modifications to existing steps
    for (const modStep of modifiedSteps) {
      if (stepMap.has(modStep.id)) {
        stepMap.set(modStep.id, { ...stepMap.get(modStep.id), ...modStep });
      } else {
        // Add new step
        stepMap.set(modStep.id, modStep);
      }
    }

    return Array.from(stepMap.values());
  }
}