import { Test, TestingModule } from '@nestjs/testing';
import { GenerateTemplateRecommendationsUseCase } from '../generate-template-recommendations.usecase';
import { InterviewSessionRepository } from '../../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { ProcessKnowledgeRepository } from '../../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { TemplateRecommendationService } from '../../../../domain/ai-agent/services/template-recommendation.service';
import { ProcessAnalysisService } from '../../../../domain/ai-agent/services/process-analysis.service';
import { KnowledgeBaseService } from '../../../../domain/ai-agent/services/knowledge-base.service';
import { WebResearchService } from '../../../../domain/ai-agent/services/web-research.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { InterviewSession } from '../../../../domain/ai-agent/entities/interview-session.entity';
import { SessionStatus } from '../../../../domain/ai-agent/enums/session-status.enum';
import { ComplexityLevel, ProcessCategory } from '../../../../domain/ai-agent/entities/process-analysis.entity';

describe('GenerateTemplateRecommendationsUseCase', () => {
  let useCase: GenerateTemplateRecommendationsUseCase;
  let sessionRepository: jest.Mocked<InterviewSessionRepository>;
  let templateService: jest.Mocked<TemplateRecommendationService>;
  let analysisService: jest.Mocked<ProcessAnalysisService>;
  let knowledgeRepository: jest.Mocked<ProcessKnowledgeRepository>;
  let researchService: jest.Mocked<WebResearchService>;

  const mockSession = {
    getSessionIdString: () => 'test-session-id',
    getUserId: () => 1,
    isActive: () => true,
    getStatus: () => SessionStatus.ACTIVE,
    getConversation: () => [
      { getRole: () => 'user', getContent: () => 'I need a process' },
      { getRole: () => 'assistant', getContent: () => 'Tell me more' },
      { getRole: () => 'user', getContent: () => 'For software development' },
    ],
    getExtractedRequirements: () => [
      {
        id: 'req-1',
        category: 'functional',
        description: 'User authentication',
        priority: 'high',
        confidence: 0.9,
      },
    ],
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateTemplateRecommendationsUseCase,
        {
          provide: 'InterviewSessionRepository',
          useValue: {
            findById: jest.fn(),
            updateGeneratedTemplate: jest.fn(),
          },
        },
        {
          provide: TemplateRecommendationService,
          useValue: {
            generateRecommendations: jest.fn(),
            validateRecommendations: jest.fn(),
          },
        },
        {
          provide: ProcessAnalysisService,
          useValue: {
            analyzeRequirements: jest.fn(),
          },
        },
        {
          provide: 'ProcessKnowledgeRepository',
          useValue: {
            findBestPractices: jest.fn(),
          },
        },
        {
          provide: KnowledgeBaseService,
          useValue: {},
        },
        {
          provide: WebResearchService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<GenerateTemplateRecommendationsUseCase>(
      GenerateTemplateRecommendationsUseCase,
    );
    sessionRepository = module.get('InterviewSessionRepository');
    templateService = module.get(TemplateRecommendationService);
    analysisService = module.get(ProcessAnalysisService);
    knowledgeRepository = module.get('ProcessKnowledgeRepository');
  });

  describe('execute', () => {
    const validInput = {
      sessionId: 'test-session-id',
      userId: 1,
      preferences: {
        preferredDuration: 'short',
      },
    };

    it('should generate template recommendations successfully', async () => {
      const mockAnalysis = {
        requirements: [
          {
            id: 'req-1',
            category: 'functional' as const,
            description: 'User authentication',
            priority: 'high' as const,
            confidence: 0.9,
            source: 'conversation',
            extractedAt: new Date(),
          },
        ],
        stakeholders: [],
        deliverables: [],
        constraints: [],
        category: ProcessCategory.DEVELOPMENT,
        complexity: ComplexityLevel.MEDIUM,
        summary: 'Software development project',
      };

      const mockRecommendations = [
        {
          id: 'template-1',
          name: 'Agile Development Process',
          description: 'Standard agile process',
          steps: [],
          confidence: 0.85,
          rationale: ['Best fit for requirements'],
          estimatedDuration: 160,
          complexity: ComplexityLevel.MEDIUM,
        },
      ];

      sessionRepository.findById.mockResolvedValue(mockSession);
      analysisService.analyzeRequirements.mockResolvedValue(mockAnalysis);
      knowledgeRepository.findBestPractices.mockResolvedValue([]);
      templateService.generateRecommendations.mockResolvedValue(mockRecommendations);
      templateService.validateRecommendations.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });
      sessionRepository.updateGeneratedTemplate.mockResolvedValue(undefined);

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(validInput.sessionId);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].name).toBe('Agile Development Process');
      expect(result.analysisId).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);

      expect(sessionRepository.findById).toHaveBeenCalledWith(validInput.sessionId);
      expect(analysisService.analyzeRequirements).toHaveBeenCalled();
      expect(templateService.generateRecommendations).toHaveBeenCalled();
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
      sessionRepository.findById.mockResolvedValue(wrongUserSession);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Unauthorized: Session does not belong to user',
      );
    });

    it('should throw error if session is not active', async () => {
      const inactiveSession = {
        ...mockSession,
        isActive: () => false,
        getStatus: () => SessionStatus.COMPLETED,
      };
      sessionRepository.findById.mockResolvedValue(inactiveSession);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Session is not active',
      );
    });

    it('should throw error if insufficient conversation history', async () => {
      const shortSession = {
        ...mockSession,
        getConversation: () => [
          { getRole: () => 'user', getContent: () => 'Hello' },
        ],
      };
      sessionRepository.findById.mockResolvedValue(shortSession);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Insufficient conversation history for template generation',
      );
    });

    it('should throw error if no requirements extracted', async () => {
      const noRequirementsSession = {
        ...mockSession,
        getExtractedRequirements: () => [],
      };
      sessionRepository.findById.mockResolvedValue(noRequirementsSession);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'No requirements extracted from session',
      );
    });

    it('should handle knowledge base search failure gracefully', async () => {
      const mockAnalysis = {
        requirements: [],
        stakeholders: [],
        deliverables: [],
        constraints: [],
        category: ProcessCategory.DEVELOPMENT,
        complexity: ComplexityLevel.MEDIUM,
        summary: 'Project',
      };

      const mockRecommendations = [
        {
          id: 'template-1',
          name: 'Standard Process',
          description: 'Standard process template',
          steps: [],
          confidence: 0.7,
          rationale: [],
          estimatedDuration: 40,
          complexity: ComplexityLevel.MEDIUM,
        },
      ];

      sessionRepository.findById.mockResolvedValue(mockSession);
      analysisService.analyzeRequirements.mockResolvedValue(mockAnalysis);
      knowledgeRepository.findBestPractices.mockRejectedValue(
        new Error('Knowledge base error'),
      );
      templateService.generateRecommendations.mockResolvedValue(mockRecommendations);
      templateService.validateRecommendations.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      // Should continue despite knowledge base failure
    });

    it('should warn but continue if validation has issues', async () => {
      const mockAnalysis = {
        requirements: [],
        stakeholders: [],
        deliverables: [],
        constraints: [],
        category: ProcessCategory.DEVELOPMENT,
        complexity: ComplexityLevel.MEDIUM,
        summary: 'Project',
      };

      const mockRecommendations = [
        {
          id: 'template-1',
          name: 'Process with Issues',
          description: 'Template with validation issues',
          steps: [],
          confidence: 0.6,
          rationale: [],
          estimatedDuration: 40,
          complexity: ComplexityLevel.MEDIUM,
        },
      ];

      sessionRepository.findById.mockResolvedValue(mockSession);
      analysisService.analyzeRequirements.mockResolvedValue(mockAnalysis);
      knowledgeRepository.findBestPractices.mockResolvedValue([]);
      templateService.generateRecommendations.mockResolvedValue(mockRecommendations);
      templateService.validateRecommendations.mockResolvedValue({
        valid: false,
        errors: ['Some validation error'],
        warnings: [],
        suggestions: [],
      });

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      // Should continue despite validation warnings
    });
  });
});