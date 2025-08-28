import { Test, TestingModule } from '@nestjs/testing';
import { ProcessAnalysisService } from '../process-analysis.service';
import { OpenAIService } from '../../../../infrastructure/ai/openai.service';
import { AIResponse } from '../../../../infrastructure/ai/ai-client.interface';
import { ComplexityLevel, ProcessCategory } from '../../entities/process-analysis.entity';

describe('ProcessAnalysisService', () => {
  let service: ProcessAnalysisService;
  let openAIService: jest.Mocked<OpenAIService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessAnalysisService,
        {
          provide: OpenAIService,
          useValue: {
            generateResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProcessAnalysisService>(ProcessAnalysisService);
    openAIService = module.get(OpenAIService);
  });

  describe('extractRequirements', () => {
    it('should extract requirements from conversation', async () => {
      const conversation = [
        { role: 'user' as const, content: 'I need a system to track orders' },
        { role: 'assistant' as const, content: 'Can you tell me more about the order tracking requirements?' },
        { role: 'user' as const, content: 'It should handle payment processing and send notifications' },
      ];

      const mockResponse: AIResponse = {
        content: JSON.stringify([
          {
            id: 'req-1',
            category: 'functional',
            description: 'Track orders',
            priority: 'high',
            confidence: 0.9,
          },
          {
            id: 'req-2',
            category: 'functional',
            description: 'Process payments',
            priority: 'high',
            confidence: 0.85,
          },
        ]),
        confidence: 0.85,
      };

      openAIService.generateResponse.mockResolvedValue(mockResponse);

      const requirements = await service.extractRequirements(conversation);

      expect(requirements).toHaveLength(2);
      expect(requirements[0]).toMatchObject({
        category: 'functional',
        description: 'Track orders',
        priority: 'high',
        confidence: 0.9,
      });
      expect(requirements[0].id).toMatch(/^req-/);
      expect(openAIService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Extract process requirements'),
        expect.objectContaining({
          userId: 0,
          sessionId: 'analysis',
        }),
      );
    });

    it('should handle empty conversation', async () => {
      const conversation: any[] = [];

      openAIService.generateResponse.mockResolvedValue({
        content: '[]',
        confidence: 0.5,
      });

      const requirements = await service.extractRequirements(conversation);

      expect(requirements).toHaveLength(0);
    });

    it('should handle malformed AI response', async () => {
      const conversation = [
        { role: 'user' as const, content: 'Test message' },
      ];

      openAIService.generateResponse.mockResolvedValue({
        content: 'Invalid JSON response',
        confidence: 0.5,
      });

      const requirements = await service.extractRequirements(conversation);

      expect(requirements).toHaveLength(0);
    });
  });

  describe('analyzeRequirements', () => {
    it('should analyze requirements and return process analysis', async () => {
      const requirements = [
        {
          id: 'req-1',
          category: 'functional' as const,
          description: 'User authentication',
          priority: 'high' as const,
          confidence: 0.9,
          source: 'conversation',
          extractedAt: new Date(),
        },
        {
          id: 'req-2',
          category: 'non-functional' as const,
          description: 'Response time under 2 seconds',
          priority: 'medium' as const,
          confidence: 0.8,
          source: 'conversation',
          extractedAt: new Date(),
        },
      ];

      const mockStakeholdersResponse: AIResponse = {
        content: JSON.stringify([
          {
            role: 'Product Owner',
            responsibilities: ['Define requirements', 'Prioritize backlog'],
            touchpoints: ['Sprint planning', 'Sprint review'],
          },
        ]),
        confidence: 0.85,
      };

      const mockDeliverablesResponse: AIResponse = {
        content: JSON.stringify([
          {
            name: 'User Stories',
            type: 'document',
            description: 'Detailed user stories with acceptance criteria',
            required: true,
          },
        ]),
        confidence: 0.85,
      };

      const mockConstraintsResponse: AIResponse = {
        content: JSON.stringify([
          {
            type: 'technical',
            description: 'Must use existing database',
            impact: 'medium',
          },
        ]),
        confidence: 0.85,
      };

      openAIService.generateResponse
        .mockResolvedValueOnce(mockStakeholdersResponse)
        .mockResolvedValueOnce(mockDeliverablesResponse)
        .mockResolvedValueOnce(mockConstraintsResponse);

      const analysis = await service.analyzeRequirements(requirements);

      expect(analysis).toBeDefined();
      expect(analysis.requirements).toEqual(requirements);
      expect(analysis.stakeholders).toHaveLength(1);
      expect(analysis.deliverables).toHaveLength(1);
      expect(analysis.constraints).toHaveLength(1);
      // Verify category is one of the valid ProcessCategory values
      expect(Object.values(ProcessCategory)).toContain(analysis.category);
      // Verify complexity is one of the valid ComplexityLevel values
      expect(Object.values(ComplexityLevel)).toContain(analysis.complexity);
    });

    it('should determine complexity based on requirements count', async () => {
      const manyRequirements = Array.from({ length: 25 }, (_, i) => ({
        id: `req-${i}`,
        category: 'functional' as const,
        description: `Requirement ${i}`,
        priority: 'medium' as const,
        confidence: 0.8,
        source: 'conversation',
        extractedAt: new Date(),
      }));

      openAIService.generateResponse.mockResolvedValue({
        content: '[]',
        confidence: 0.5,
      });

      const analysis = await service.analyzeRequirements(manyRequirements);

      expect(analysis.complexity).toBe(ComplexityLevel.VERY_COMPLEX);
    });
  });

  describe('calculateConversationProgress', () => {
    it('should calculate progress based on conversation and requirements', async () => {
      const conversation = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i}`,
      }));

      const requirements = Array.from({ length: 5 }, (_, i) => ({
        id: `req-${i}`,
        category: i === 0 ? 'non-functional' as const : 'functional' as const,
        description: `Requirement ${i}`,
        priority: 'medium' as const,
        confidence: 0.8,
      }));

      const progress = await service.calculateConversationProgress(
        conversation,
        requirements as any,
      );

      expect(progress).toBeDefined();
      expect(progress.completeness).toBeGreaterThanOrEqual(0);
      expect(progress.completeness).toBeLessThanOrEqual(1);
      expect(progress.missingAreas).toBeDefined();
    });

    it('should identify missing requirement areas', async () => {
      const conversation = [
        { role: 'user' as const, content: 'Test' },
      ];

      const requirements = [
        {
          id: 'req-1',
          category: 'functional' as const,
          description: 'Functional requirement',
          priority: 'high' as const,
          confidence: 0.9,
        },
      ];

      const progress = await service.calculateConversationProgress(
        conversation,
        requirements as any,
      );

      expect(progress.missingAreas).toContain('non-functional requirements');
      expect(progress.missingAreas).toContain('technical constraints');
    });

    it('should show high completeness for comprehensive requirements', async () => {
      const conversation = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i}`,
      }));

      const requirements = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `func-${i}`,
          category: 'functional' as const,
          description: `Functional requirement ${i}`,
          priority: 'high' as const,
          confidence: 0.9,
        })),
        {
          id: 'non-func-1',
          category: 'non-functional' as const,
          description: 'Performance requirement',
          priority: 'high' as const,
          confidence: 0.9,
        },
        {
          id: 'tech-1',
          category: 'technical' as const,
          description: 'Technical constraint',
          priority: 'medium' as const,
          confidence: 0.8,
        },
      ];

      const progress = await service.calculateConversationProgress(
        conversation,
        requirements as any,
      );

      expect(progress.completeness).toBeGreaterThan(0.9);
      expect(progress.missingAreas).toBeUndefined();
    });
  });
});