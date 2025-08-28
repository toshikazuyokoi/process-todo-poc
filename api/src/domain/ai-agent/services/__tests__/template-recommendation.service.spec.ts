import { Test, TestingModule } from '@nestjs/testing';
import { TemplateRecommendationService } from '../template-recommendation.service';
import { OpenAIService } from '../../../../infrastructure/ai/openai.service';
import { KnowledgeBaseService } from '../knowledge-base.service';
import { ProcessAnalysis } from '../process-analysis.service';
import { ComplexityLevel, ProcessCategory } from '../../entities/process-analysis.entity';

describe('TemplateRecommendationService', () => {
  let service: TemplateRecommendationService;
  let openAIService: jest.Mocked<OpenAIService>;
  let knowledgeService: jest.Mocked<KnowledgeBaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateRecommendationService,
        {
          provide: OpenAIService,
          useValue: {
            generateTemplate: jest.fn(),
          },
        },
        {
          provide: KnowledgeBaseService,
          useValue: {
            getRelatedTemplates: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TemplateRecommendationService>(TemplateRecommendationService);
    openAIService = module.get(OpenAIService);
    knowledgeService = module.get(KnowledgeBaseService);
  });

  describe('generateRecommendations', () => {
    const mockAnalysis: ProcessAnalysis = {
      requirements: [
        {
          id: 'req-1',
          category: 'functional',
          description: 'User authentication',
          priority: 'high',
          confidence: 0.9,
          source: 'conversation',
          extractedAt: new Date(),
        },
      ],
      stakeholders: [
        {
          id: 'stakeholder-1',
          role: 'Product Owner',
          responsibilities: ['Define requirements'],
          touchpoints: ['Sprint planning'],
        },
      ],
      deliverables: [
        {
          id: 'deliverable-1',
          name: 'User Stories',
          description: 'User stories with acceptance criteria',
          format: 'document',
          owner: 'Product Owner',
        },
      ],
      constraints: [
        {
          id: 'constraint-1',
          type: 'technical',
          description: 'Use existing database',
          impact: 'medium',
        },
      ],
      category: ProcessCategory.OPERATIONS,
      complexity: ComplexityLevel.SIMPLE,
      summary: 'Software development project',
    };

    const mockContext = {
      industry: 'software',
      processType: 'development',
      constraints: ['Use existing database'],
      preferences: [],
    };

    it('should generate template recommendations', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Agile Development Process',
        description: 'Standard agile development process',
        steps: [
          {
            name: 'Planning',
            description: 'Sprint planning',
            duration: 8,
            dependencies: [],
          },
        ],
        confidence: 0.85,
        reasoning: 'Best fit for requirements',
      };

      knowledgeService.getRelatedTemplates.mockResolvedValue([]);
      openAIService.generateTemplate.mockResolvedValue(mockTemplate);

      const recommendations = await service.generateRecommendations(
        mockAnalysis,
        mockContext,
      );

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].name).toBe('Agile Development Process');
      expect(recommendations[0].confidence).toBeGreaterThan(0);
      expect(recommendations[0].alternatives).toBeDefined();
      expect(openAIService.generateTemplate).toHaveBeenCalled();
    });

    it('should generate alternatives for primary recommendation', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Standard Process',
        description: 'Standard process template',
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            description: 'First step',
            duration: 8,
            dependencies: [],
            artifacts: [],
            responsible: 'Team',
            criticalPath: true,
          },
        ],
        confidence: 0.8,
        reasoning: 'Standard approach',
      };

      knowledgeService.getRelatedTemplates.mockResolvedValue([]);
      openAIService.generateTemplate.mockResolvedValue(mockTemplate);

      const recommendations = await service.generateRecommendations(
        mockAnalysis,
        mockContext,
      );

      expect(recommendations[0].alternatives).toHaveLength(2);
      
      const simplified = recommendations[0].alternatives?.find(
        alt => alt.name.includes('Simplified'),
      );
      expect(simplified).toBeDefined();
      expect(simplified?.complexity).toBe(ComplexityLevel.SIMPLE);
      
      const extended = recommendations[0].alternatives?.find(
        alt => alt.name.includes('Extended'),
      );
      expect(extended).toBeDefined();
      expect(extended?.complexity).toBe(ComplexityLevel.COMPLEX);
    });
  });

  describe('validateRecommendations', () => {
    it('should validate recommendations successfully', async () => {
      const recommendations = [
        {
          id: 'template-1',
          name: 'Valid Template',
          description: 'Valid template',
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
            {
              id: 'step-2',
              name: 'Step 2',
              description: 'Second step',
              duration: 8,
              dependencies: ['step-1'],
              artifacts: [],
              responsible: 'Team',
              criticalPath: false,
            },
          ],
          confidence: 0.8,
          rationale: ['Reason 1', 'Reason 2', 'Reason 3'],
          estimatedDuration: 16,
          complexity: ComplexityLevel.MEDIUM,
        },
      ];

      const result = await service.validateRecommendations(recommendations);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid dependencies', async () => {
      const recommendations = [
        {
          id: 'template-1',
          name: 'Invalid Template',
          description: 'Template with invalid dependencies',
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              description: 'First step',
              duration: 8,
              dependencies: ['step-999'], // Invalid dependency
              artifacts: [],
              responsible: 'Team',
              criticalPath: false,
            },
          ],
          confidence: 0.8,
          rationale: [],
          estimatedDuration: 8,
          complexity: ComplexityLevel.SIMPLE,
        },
      ];

      const result = await service.validateRecommendations(recommendations);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid dependencies in template: Invalid Template');
    });

    it('should detect circular dependencies', async () => {
      const recommendations = [
        {
          id: 'template-1',
          name: 'Circular Template',
          description: 'Template with circular dependencies',
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              description: 'First step',
              duration: 8,
              dependencies: ['step-2'],
              artifacts: [],
              responsible: 'Team',
              criticalPath: false,
            },
            {
              id: 'step-2',
              name: 'Step 2',
              description: 'Second step',
              duration: 8,
              dependencies: ['step-1'],
              artifacts: [],
              responsible: 'Team',
              criticalPath: false,
            },
          ],
          confidence: 0.8,
          rationale: [],
          estimatedDuration: 16,
          complexity: ComplexityLevel.MEDIUM,
        },
      ];

      const result = await service.validateRecommendations(recommendations);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Circular dependencies detected in template: Circular Template');
    });

    it('should provide warnings and suggestions', async () => {
      const recommendations = [
        {
          id: 'template-1',
          name: 'Minimal Template',
          description: 'Template with few steps',
          steps: [
            {
              id: 'step-1',
              name: 'Only Step',
              description: 'Single step',
              duration: 8,
              dependencies: [],
              artifacts: [],
              responsible: 'Team',
              criticalPath: false,
            },
          ],
          confidence: 0.6,
          rationale: [],
          estimatedDuration: 8,
          complexity: ComplexityLevel.SIMPLE,
        },
      ];

      const result = await service.validateRecommendations(recommendations);

      expect(result.warnings).toContain('Template Minimal Template has very few steps');
      expect(result.suggestions).toContain('Consider reviewing template Minimal Template due to low confidence');
    });
  });

  describe('optimizeStepSequence', () => {
    it('should optimize step sequence based on dependencies', async () => {
      const steps = [
        {
          id: 'step-3',
          name: 'Step 3',
          description: 'Third step',
          duration: 8,
          dependencies: ['step-1', 'step-2'],
          artifacts: [],
          responsible: 'Team',
          criticalPath: false,
        },
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
        {
          id: 'step-2',
          name: 'Step 2',
          description: 'Second step',
          duration: 8,
          dependencies: ['step-1'],
          artifacts: [],
          responsible: 'Team',
          criticalPath: false,
        },
      ];

      const optimized = await service.optimizeStepSequence(steps);

      expect(optimized[0].dependencies).toHaveLength(0); // First step should have no dependencies
      expect(optimized[optimized.length - 1].dependencies.length).toBeGreaterThan(0); // Last step should have dependencies
    });

    it('should mark critical path steps', async () => {
      const steps = [
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
        {
          id: 'step-2',
          name: 'Step 2',
          description: 'Second step',
          duration: 8,
          dependencies: [],
          artifacts: [],
          responsible: 'Team',
          criticalPath: false,
        },
      ];

      const optimized = await service.optimizeStepSequence(steps);

      // At least some steps should be marked as critical path
      const criticalSteps = optimized.filter(s => s.criticalPath);
      expect(criticalSteps.length).toBeGreaterThan(0);
    });
  });

  describe('calculateConfidenceScores', () => {
    it('should calculate confidence based on template completeness', async () => {
      const recommendations = [
        {
          id: 'template-1',
          name: 'Complete Template',
          description: 'Complete template',
          steps: Array.from({ length: 12 }, (_, i) => ({
            id: `step-${i}`,
            name: `Step ${i}`,
            description: `Step ${i} description`,
            duration: 8,
            dependencies: [],
            artifacts: [],
            responsible: 'Team',
            criticalPath: false,
          })),
          confidence: 0.5,
          rationale: ['Reason 1', 'Reason 2', 'Reason 3', 'Reason 4'],
          estimatedDuration: 96,
          complexity: ComplexityLevel.SIMPLE,
        },
      ];

      const scored = await service.calculateConfidenceScores(recommendations);

      expect(scored[0].confidence).toBeGreaterThan(0.8);
    });

    it('should reduce confidence for high complexity', async () => {
      const recommendations = [
        {
          id: 'template-1',
          name: 'Complex Template',
          description: 'Complex template',
          steps: Array.from({ length: 5 }, (_, i) => ({
            id: `step-${i}`,
            name: `Step ${i}`,
            description: `Step ${i} description`,
            duration: 8,
            dependencies: [],
            artifacts: [],
            responsible: 'Team',
            criticalPath: false,
          })),
          confidence: 0.5,
          rationale: [],
          estimatedDuration: 40,
          complexity: ComplexityLevel.COMPLEX,
        },
      ];

      const scored = await service.calculateConfidenceScores(recommendations);

      expect(scored[0].confidence).toBeLessThan(0.7);
    });
  });
});