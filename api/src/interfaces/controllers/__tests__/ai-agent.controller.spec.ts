import { Test, TestingModule } from '@nestjs/testing';
import { AIAgentController } from '../ai-agent.controller';
import { HttpStatus, ExecutionContext } from '@nestjs/common';
import { StartInterviewSessionUseCase } from '../../../application/usecases/ai-agent/start-interview-session.usecase';
import { GetInterviewSessionUseCase } from '../../../application/usecases/ai-agent/get-interview-session.usecase';
import { EndInterviewSessionUseCase } from '../../../application/usecases/ai-agent/end-interview-session.usecase';
import { ProcessUserMessageUseCase } from '../../../application/usecases/ai-agent/process-user-message.usecase';
import { GetConversationHistoryUseCase } from '../../../application/usecases/ai-agent/get-conversation-history.usecase';
import { CollectUserFeedbackUseCase } from '../../../application/usecases/ai-agent/collect-user-feedback.usecase';
import { GenerateTemplateRecommendationsUseCase } from '../../../application/usecases/ai-agent/generate-template-recommendations.usecase';
import { FinalizeTemplateCreationUseCase } from '../../../application/usecases/ai-agent/finalize-template-creation.usecase';
import { SearchBestPracticesUseCase } from '../../../application/usecases/ai-agent/search-best-practices.usecase';
import { SearchComplianceRequirementsUseCase } from '../../../application/usecases/ai-agent/search-compliance-requirements.usecase';
import { SearchProcessBenchmarksUseCase } from '../../../application/usecases/ai-agent/search-process-benchmarks.usecase';
import { AIRateLimitGuard } from '../../guards/ai-rate-limit.guard';
import { AIFeatureFlagGuard } from '../../../infrastructure/security/ai-feature-flag.guard';
import { APP_GUARD } from '@nestjs/core';
// Knowledge Base use cases needed by the controller constructor
import { GetIndustryTemplatesUseCase } from '../../../application/usecases/knowledge-base/get-industry-templates.usecase';
import { CreateIndustryTemplateUseCase } from '../../../application/usecases/knowledge-base/create-industry-template.usecase';
import { UpdateIndustryTemplateUseCase } from '../../../application/usecases/knowledge-base/update-industry-template.usecase';
import { DeleteIndustryTemplateUseCase } from '../../../application/usecases/knowledge-base/delete-industry-template.usecase';
import { GetProcessTypesUseCase } from '../../../application/usecases/knowledge-base/get-process-types.usecase';
import { CreateProcessTypeUseCase } from '../../../application/usecases/knowledge-base/create-process-type.usecase';
import { UpdateProcessTypeUseCase } from '../../../application/usecases/knowledge-base/update-process-type.usecase';
import { DeleteProcessTypeUseCase } from '../../../application/usecases/knowledge-base/delete-process-type.usecase';
import { GetBestPracticesUseCase } from '../../../application/usecases/knowledge-base/get-best-practices.usecase';
import { CreateBestPracticeUseCase } from '../../../application/usecases/knowledge-base/create-best-practice.usecase';
import { UpdateBestPracticeUseCase } from '../../../application/usecases/knowledge-base/update-best-practice.usecase';
import { BulkUpdateBestPracticesUseCase } from '../../../application/usecases/knowledge-base/bulk-update-best-practices.usecase';

// Mock Guards
const mockAIRateLimitGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockAIFeatureFlagGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('AIAgentController', () => {
  let controller: AIAgentController;
  let startInterviewUseCase: jest.Mocked<StartInterviewSessionUseCase>;
  let getInterviewUseCase: jest.Mocked<GetInterviewSessionUseCase>;
  let endInterviewUseCase: jest.Mocked<EndInterviewSessionUseCase>;
  let processMessageUseCase: jest.Mocked<ProcessUserMessageUseCase>;
  let getConversationUseCase: jest.Mocked<GetConversationHistoryUseCase>;
  let collectFeedbackUseCase: jest.Mocked<CollectUserFeedbackUseCase>;
  let generateTemplateUseCase: jest.Mocked<GenerateTemplateRecommendationsUseCase>;
  let finalizeTemplateUseCase: jest.Mocked<FinalizeTemplateCreationUseCase>;
  let searchBestPracticesUseCase: jest.Mocked<SearchBestPracticesUseCase>;
  let searchComplianceUseCase: jest.Mocked<SearchComplianceRequirementsUseCase>;
  let searchBenchmarksUseCase: jest.Mocked<SearchProcessBenchmarksUseCase>;

  const mockRequest = {
    user: {
      id: 1,
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIAgentController],
      providers: [
        {
          provide: StartInterviewSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetInterviewSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: EndInterviewSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ProcessUserMessageUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetConversationHistoryUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CollectUserFeedbackUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GenerateTemplateRecommendationsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: FinalizeTemplateCreationUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SearchBestPracticesUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SearchComplianceRequirementsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SearchProcessBenchmarksUseCase,
          useValue: { execute: jest.fn() },
        },
        // Knowledge Base use cases required by controller constructor
        { provide: GetIndustryTemplatesUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateIndustryTemplateUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateIndustryTemplateUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteIndustryTemplateUseCase, useValue: { execute: jest.fn() } },
        { provide: GetProcessTypesUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateProcessTypeUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProcessTypeUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProcessTypeUseCase, useValue: { execute: jest.fn() } },
        { provide: GetBestPracticesUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateBestPracticeUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateBestPracticeUseCase, useValue: { execute: jest.fn() } },
        { provide: BulkUpdateBestPracticesUseCase, useValue: { execute: jest.fn() } },
        // Guards
        { provide: AIRateLimitGuard, useValue: mockAIRateLimitGuard },
        { provide: AIFeatureFlagGuard, useValue: mockAIFeatureFlagGuard },
      ],
    })
      .overrideGuard(AIRateLimitGuard)
      .useValue(mockAIRateLimitGuard)
      .overrideGuard(AIFeatureFlagGuard)
      .useValue(mockAIFeatureFlagGuard)
      .compile();

    controller = module.get<AIAgentController>(AIAgentController);
    startInterviewUseCase = module.get(StartInterviewSessionUseCase);
    getInterviewUseCase = module.get(GetInterviewSessionUseCase);
    endInterviewUseCase = module.get(EndInterviewSessionUseCase);
    processMessageUseCase = module.get(ProcessUserMessageUseCase);
    getConversationUseCase = module.get(GetConversationHistoryUseCase);
    collectFeedbackUseCase = module.get(CollectUserFeedbackUseCase);
    generateTemplateUseCase = module.get(GenerateTemplateRecommendationsUseCase);
    finalizeTemplateUseCase = module.get(FinalizeTemplateCreationUseCase);
    searchBestPracticesUseCase = module.get(SearchBestPracticesUseCase);
    searchComplianceUseCase = module.get(SearchComplianceRequirementsUseCase);
    searchBenchmarksUseCase = module.get(SearchProcessBenchmarksUseCase);
  });

  describe('POST /sessions/:sessionId/generate-template', () => {
    it('should generate template recommendations successfully', async () => {
      const sessionId = 'test-session-id';
      const dto = {
        preferences: {
          complexity: 'MEDIUM' as any,
          industry: 'software',
        },
      };

      const mockResult = {
        sessionId,
        recommendations: [
          {
            id: 'template-1',
            name: 'Agile Development Process',
            description: 'Standard agile process',
            steps: [
              {
                id: 'step-1',
                name: 'Planning',
                description: 'Sprint planning',
                duration: 8,
                dependencies: [],
                artifacts: [],
                responsible: 'Team',
                criticalPath: true,
              },
            ],
            confidence: 0.85,
            rationale: ['Best fit', 'Industry standard'],
            estimatedDuration: 8,
            complexity: 'MEDIUM' as any,
            alternatives: [],
          },
        ],
        analysisId: 'analysis-123',
        generatedAt: new Date(),
      };

      generateTemplateUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.generateTemplate(
        mockRequest,
        sessionId,
        dto,
      );

      expect(result).toEqual(mockResult);
      expect(generateTemplateUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
        preferences: dto.preferences,
      });
    });

    it('should handle errors when generating template', async () => {
      const sessionId = 'test-session-id';
      const dto = { preferences: {} };

      generateTemplateUseCase.execute.mockRejectedValue(
        new Error('Session not found'),
      );

      await expect(
        controller.generateTemplate(mockRequest, sessionId, dto),
      ).rejects.toThrow('Session not found');
    });
  });

  describe('POST /sessions/:sessionId/finalize-template', () => {
    it('should finalize template successfully', async () => {
      const sessionId = 'test-session-id';
      const dto = {
        templateId: 'template-1',
        modifications: {
          name: 'Modified Template Name',
          steps: [
            {
              id: 'step-1',
              name: 'Modified Step',
              description: 'Step description',
              duration: 16,
              dependencies: [],
              artifacts: [],
              responsible: 'Team',
              criticalPath: false,
            },
          ],
        },
        notes: 'Custom modifications applied',
      };

      const mockResult = {
        sessionId,
        templateId: 'template-1',
        name: 'Modified Template Name',
        description: 'Template description',
        steps: [
          {
            id: 'step-1',
            name: 'Modified Step',
            description: 'Step description',
            duration: 16,
            dependencies: [],
            artifacts: [],
            responsible: 'Team',
            criticalPath: false,
          },
        ],
        estimatedDuration: 16,
        complexity: 'medium' as const,
        status: 'finalized' as const,
        metadata: {},
        createdAt: new Date(),
      };

      finalizeTemplateUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.finalizeTemplate(
        mockRequest,
        sessionId,
        dto,
      );

      expect(result).toEqual(mockResult);
      expect(finalizeTemplateUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
        templateId: dto.templateId,
        modifications: dto.modifications,
        notes: dto.notes,
      });
    });

    it('should finalize template without modifications', async () => {
      const sessionId = 'test-session-id';
      const dto = {
        templateId: 'template-1',
        notes: 'No modifications',
      };

      const mockResult = {
        sessionId,
        templateId: 'template-1',
        name: 'Original Template',
        description: 'Original description',
        steps: [],
        estimatedDuration: 8,
        complexity: 'LOW' as any,
        status: 'finalized' as const,
        metadata: {},
        createdAt: new Date(),
      };

      finalizeTemplateUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.finalizeTemplate(
        mockRequest,
        sessionId,
        dto,
      );

      expect(result).toEqual(mockResult);
      expect(finalizeTemplateUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
        templateId: dto.templateId,
        modifications: undefined,
        notes: dto.notes,
      });
    });

    it('should handle validation errors', async () => {
      const sessionId = 'test-session-id';
      const dto = {
        templateId: '',
        notes: 'Invalid template ID',
      };

      finalizeTemplateUseCase.execute.mockRejectedValue(
        new Error('Template ID is required'),
      );

      await expect(
        controller.finalizeTemplate(mockRequest, sessionId, dto),
      ).rejects.toThrow('Template ID is required');
    });
  });

  describe('POST /knowledge/best-practices/search', () => {
    it('should search best practices successfully', async () => {
      const dto = {
        query: 'agile development best practices',
        filters: {
          industry: 'software',
          processType: 'development',
          complexity: 'MEDIUM' as any,
          tags: ['agile', 'scrum'],
        },
        limit: 10,
      };

      const mockResult = {
        query: dto.query,
        results: [
          {
            id: 'bp-1',
            title: 'Agile Development Guide',
            description: 'Comprehensive guide for agile development',
            source: 'knowledge_base' as const,
            relevance: 0.9,
            industry: 'software',
            processType: 'development',
            complexity: 'MEDIUM' as any,
            tags: ['agile', 'scrum'],
            publishedAt: new Date('2024-01-01'),
          },
          {
            id: 'bp-2',
            title: 'Scrum Best Practices',
            description: 'Essential scrum practices',
            source: 'web_research' as const,
            relevance: 0.85,
            url: 'https://example.com/scrum',
            author: 'Scrum Alliance',
            citations: 150,
            publishedAt: new Date('2023-12-01'),
          },
        ],
        totalResults: 2,
        searchedAt: new Date(),
        filters: dto.filters,
      };

      searchBestPracticesUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.searchBestPractices(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(searchBestPracticesUseCase.execute).toHaveBeenCalledWith({
        userId: mockRequest.user.id,
        query: dto.query,
        filters: dto.filters,
        limit: dto.limit,
      });
    });

    it('should search without filters', async () => {
      const dto = {
        query: 'process optimization',
        limit: 5,
      };

      const mockResult = {
        query: dto.query,
        results: [],
        totalResults: 0,
        searchedAt: new Date(),
        filters: {},
      };

      searchBestPracticesUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.searchBestPractices(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(searchBestPracticesUseCase.execute).toHaveBeenCalledWith({
        userId: mockRequest.user.id,
        query: dto.query,
        filters: undefined,
        limit: dto.limit,
      });
    });

    it('should handle empty search results', async () => {
      const dto = {
        query: 'very specific query with no results',
      };

      const mockResult = {
        query: dto.query,
        results: [],
        totalResults: 0,
        searchedAt: new Date(),
        filters: {},
      };

      searchBestPracticesUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.searchBestPractices(mockRequest, dto);

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });

    it('should handle search errors', async () => {
      const dto = {
        query: '',
      };

      searchBestPracticesUseCase.execute.mockRejectedValue(
        new Error('Query is required'),
      );

      await expect(
        controller.searchBestPractices(mockRequest, dto),
      ).rejects.toThrow('Query is required');
    });
  });

  // Existing endpoint tests for Week 5 functionality
  describe('POST /sessions', () => {
    it('should start a new session successfully', async () => {
      const dto = {
        industry: 'software',
        processType: 'development',
        goal: 'Implement new feature',
        additionalContext: { methodology: 'agile' },
      };

      const mockResult = {
        sessionId: 'session-123',
        status: 'active' as const,
        welcomeMessage: 'Welcome! Let\'s discuss your process.',
        suggestedQuestions: ['What type of process are you working on?', 'What is your timeline?'],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      startInterviewUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.startSession(mockRequest, dto);

      expect(result.sessionId).toBe('session-123');
      expect(result.status).toBe('active');
      expect(result.conversation).toHaveLength(1);
      expect(result.conversation[0].role).toBe('assistant');
      expect(startInterviewUseCase.execute).toHaveBeenCalledWith({
        userId: mockRequest.user.id,
        industry: dto.industry,
        processType: dto.processType,
        goal: dto.goal,
        additionalContext: dto.additionalContext,
      });
    });
  });

  describe('GET /sessions/:sessionId', () => {
    it('should retrieve session details', async () => {
      const sessionId = 'session-123';
      const mockResult = {
        sessionId,
        status: 'active' as const,
        context: {
          industry: 'software',
          processType: 'development',
          goal: 'Test goal',
        },
        conversation: [],
        requirements: [],
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getInterviewUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.getSession(mockRequest, sessionId);

      expect(result).toEqual(mockResult);
      expect(getInterviewUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
      });
    });
  });

  describe('DELETE /sessions/:sessionId', () => {
    it('should end session successfully', async () => {
      const sessionId = 'session-123';
      endInterviewUseCase.execute.mockResolvedValue(undefined);

      await controller.endSession(mockRequest, sessionId);

      expect(endInterviewUseCase.execute).toHaveBeenCalledWith({
        sessionId,
        userId: mockRequest.user.id,
      });
    });
  });

  describe('POST /sessions/:sessionId/messages', () => {
    it('should process user message', async () => {
      const sessionId = 'session-123';
      const dto = {
        message: 'We need user authentication',
        metadata: { source: 'web' },
      };

      const mockResult = {
        sessionId,
        userMessage: {
          role: 'user' as const,
          content: dto.message,
          timestamp: new Date(),
        },
        aiResponse: {
          role: 'assistant' as const,
          content: 'I understand you need authentication. Can you tell me more?',
          timestamp: new Date(),
        },
        extractedRequirements: [
          {
            id: 'req-1',
            category: 'functional',
            description: 'User authentication',
            priority: 'high',
            confidence: 0.9,
          },
        ],
        conversationProgress: {
          completeness: 0.3,
          missingAreas: ['authorization', 'user roles'],
        },
      };

      processMessageUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.sendMessage(mockRequest, sessionId, dto);

      expect(result.sessionId).toBe(sessionId);
      expect(result.userMessage).toEqual(mockResult.userMessage);
      expect(result.aiResponse).toEqual(mockResult.aiResponse);
      expect(result.extractedRequirements).toEqual(mockResult.extractedRequirements);
    });
  });

  describe('POST /knowledge/feedback', () => {
    it('should submit feedback successfully', async () => {
      const dto = {
        sessionId: 'session-123',
        type: 'positive' as any,
        category: 'response_quality' as any,
        rating: 5,
        message: 'Very helpful',
        metadata: { source: 'web' },
      };

      const mockResult = {
        feedbackId: 'feedback-' + Date.now(),
        sessionId: dto.sessionId,
        userId: mockRequest.user.id,
        type: dto.type,
        category: dto.category,
        rating: dto.rating,
        message: dto.message,
        metadata: dto.metadata,
        submittedAt: new Date(),
        processed: false,
      };

      collectFeedbackUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.submitFeedback(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(collectFeedbackUseCase.execute).toHaveBeenCalledWith({
        sessionId: dto.sessionId,
        userId: mockRequest.user.id,
        type: dto.type,
        category: dto.category,
        rating: dto.rating,
        message: dto.message,
        metadata: dto.metadata,
      });
    });
  });
});