import { Test, TestingModule } from '@nestjs/testing';
import { FinalizeTemplateCreationUseCase } from '../finalize-template-creation.usecase';
import { InterviewSessionRepository } from '../../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { TemplateGenerationHistoryRepository } from '../../../../domain/ai-agent/repositories/template-generation-history.repository.interface';
import { TemplateRecommendationService } from '../../../../domain/ai-agent/services/template-recommendation.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { ComplexityLevel } from '../../../../domain/ai-agent/entities/process-analysis.entity';

describe('FinalizeTemplateCreationUseCase', () => {
  let useCase: FinalizeTemplateCreationUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let historyRepository: jest.Mocked<TemplateGenerationHistoryRepository>;
  let templateService: jest.Mocked<TemplateRecommendationService>;

  const mockSession = {
    getUserId: () => 1,
    getGeneratedTemplate: () => ({
      id: 'template-1',
      name: 'Test Template',
      description: 'Test template description',
      steps: [
        {
          id: 'step-1',
          name: 'Step 1',
          description: 'First step',
          duration: 8,
          dependencies: [],
          artifacts: [],
          responsible: 'Team',
          criticalPath: false,
        },
      ],
      confidence: 0.85,
      rationale: ['Best fit for requirements'],
      estimatedDuration: 8,
      complexity: ComplexityLevel.MEDIUM,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinalizeTemplateCreationUseCase,
        {
          provide: 'InterviewSessionRepository',
          useValue: {
            findById: jest.fn(),
            markAsCompleted: jest.fn(),
          },
        },
        {
          provide: 'TemplateGenerationHistoryRepository',
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: TemplateRecommendationService,
          useValue: {
            validateRecommendations: jest.fn(),
            optimizeStepSequence: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<FinalizeTemplateCreationUseCase>(
      FinalizeTemplateCreationUseCase,
    );
    sessionRepository = module.get('InterviewSessionRepository');
    historyRepository = module.get('TemplateGenerationHistoryRepository');
    templateService = module.get(TemplateRecommendationService);
  });

  describe('execute', () => {
    const validInput = {
      sessionId: 'test-session-id',
      userId: 1,
      templateId: 'template-1',
      notes: 'Test notes',
    };

    it('should finalize template successfully', async () => {
      sessionRepository.findById.mockResolvedValue(mockSession as any);
      templateService.validateRecommendations.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });
      templateService.optimizeStepSequence.mockResolvedValue(
        mockSession.getGeneratedTemplate().steps,
      );
      historyRepository.save.mockResolvedValue({
        id: 1,
        sessionId: validInput.sessionId,
        userId: validInput.userId,
        generatedTemplate: mockSession.getGeneratedTemplate(),
        requirementsUsed: [],
        createdAt: new Date(),
      });
      sessionRepository.markAsCompleted.mockResolvedValue(undefined);

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.templateId).toBe('template-1');
      expect(result.sessionId).toBe(validInput.sessionId);
      expect(result.name).toBe('Test Template');
      expect(result.status).toBe('finalized');
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(sessionRepository.findById).toHaveBeenCalledWith(validInput.sessionId);
      expect(templateService.validateRecommendations).toHaveBeenCalled();
      expect(templateService.optimizeStepSequence).toHaveBeenCalled();
      expect(historyRepository.save).toHaveBeenCalled();
      expect(sessionRepository.markAsCompleted).toHaveBeenCalledWith(validInput.sessionId);
    });

    it('should apply modifications to template', async () => {
      const inputWithModifications = {
        ...validInput,
        modifications: {
          name: 'Modified Template Name',
          description: 'Modified description',
          steps: [
            {
              id: 'step-1',
              name: 'Modified Step 1',
              duration: 16,
            },
          ],
        },
      };

      sessionRepository.findById.mockResolvedValue(mockSession as any);
      templateService.validateRecommendations.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });
      templateService.optimizeStepSequence.mockImplementation(async (steps) => steps);
      historyRepository.save.mockResolvedValue({} as any);
      sessionRepository.markAsCompleted.mockResolvedValue(undefined);

      const result = await useCase.execute(inputWithModifications);

      expect(result.name).toBe('Modified Template Name');
      expect(result.description).toBe('Modified description');
      expect(historyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          modifications: [inputWithModifications.modifications],
        }),
      );
    });

    it('should throw error if session ID is missing', async () => {
      const invalidInput = {
        ...validInput,
        sessionId: '',
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'Session ID is required',
      );
    });

    it('should throw error if user ID is missing', async () => {
      const invalidInput = {
        ...validInput,
        userId: undefined as any,
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'User ID is required',
      );
    });

    it('should throw error if template ID is missing', async () => {
      const invalidInput = {
        ...validInput,
        templateId: '',
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'Template ID is required',
      );
    });

    it('should throw error if session not found', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Session not found: test-session-id',
      );
    });

    it('should throw error if session belongs to different user', async () => {
      const wrongUserSession = {
        ...mockSession,
        getUserId: () => 999,
      };
      sessionRepository.findById.mockResolvedValue(wrongUserSession as any);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Unauthorized: Session does not belong to user',
      );
    });

    it('should throw error if no template has been generated', async () => {
      const noTemplateSession = {
        ...mockSession,
        getGeneratedTemplate: () => null,
      };
      sessionRepository.findById.mockResolvedValue(noTemplateSession as any);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'No template has been generated for this session',
      );
    });

    it('should throw error if template validation fails', async () => {
      sessionRepository.findById.mockResolvedValue(mockSession as any);
      templateService.validateRecommendations.mockResolvedValue({
        valid: false,
        errors: ['Invalid step dependencies', 'Missing required fields'],
        warnings: [],
        suggestions: [],
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Template validation failed: Invalid step dependencies, Missing required fields',
      );
    });

    it('should handle errors during history save gracefully', async () => {
      sessionRepository.findById.mockResolvedValue(mockSession as any);
      templateService.validateRecommendations.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });
      templateService.optimizeStepSequence.mockResolvedValue(
        mockSession.getGeneratedTemplate().steps,
      );
      historyRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(validInput)).rejects.toThrow('Database error');
      
      // Should not mark session as completed if history save fails
      expect(sessionRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('should add new steps when modifying template', async () => {
      const inputWithNewStep = {
        ...validInput,
        modifications: {
          steps: [
            {
              id: 'step-2',
              name: 'New Step 2',
              description: 'Additional step',
              duration: 12,
              dependencies: ['step-1'],
              artifacts: ['Document'],
              responsible: 'Manager',
            },
          ],
        },
      };

      sessionRepository.findById.mockResolvedValue(mockSession as any);
      templateService.validateRecommendations.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });
      templateService.optimizeStepSequence.mockImplementation(async (steps) => steps);
      historyRepository.save.mockResolvedValue({} as any);
      sessionRepository.markAsCompleted.mockResolvedValue(undefined);

      const result = await useCase.execute(inputWithNewStep);

      expect(result.steps).toHaveLength(2);
      expect(templateService.optimizeStepSequence).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'step-1' }),
          expect.objectContaining({ id: 'step-2' }),
        ]),
      );
    });
  });
});