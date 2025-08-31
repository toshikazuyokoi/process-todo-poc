/**
 * Template Converter Utility Tests
 * Tests for converting between AI-generated templates and existing system templates
 */

import {
  convertGeneratedToProcess,
  convertProcessToGenerated,
  validateTemplateConversion,
  mergeAIMetadata,
} from '../utils/template-converter';
import { GeneratedTemplate } from '../types';
import { ProcessTemplate } from '@/app/types';

describe('Template Converter Tests', () => {
  const mockGeneratedTemplate: GeneratedTemplate = {
    id: 'gen-template-1',
    sessionId: 'session-123',
    name: 'Software Development Process',
    description: 'A comprehensive software development template',
    steps: [
      {
        id: 'step-1',
        name: 'Requirements Analysis',
        description: 'Analyze and document requirements',
        duration: 5,
        dependencies: [],
      },
      {
        id: 'step-2',
        name: 'Design',
        description: 'Create system and database design',
        duration: 3,
        dependencies: ['step-1'],
      },
      {
        id: 'step-3',
        name: 'Implementation',
        description: 'Write code and unit tests',
        duration: 10,
        dependencies: ['step-2'],
      },
    ],
    metadata: {
      generatedAt: '2024-01-01T00:00:00Z',
      generationTime: 5000,
      confidence: 0.85,
      sources: ['Best Practices', 'Industry Standards'],
      version: 1,
      isActive: true,
    },
  };

  describe('convertGeneratedToProcess', () => {
    it('should convert AI template to process template', () => {
      const result = convertGeneratedToProcess(mockGeneratedTemplate);

      expect(result.name).toBe('Software Development Process');
      expect(result.version).toBe(1);
      expect(result.isActive).toBe(true);
      expect(result.stepTemplates).toHaveLength(3);
    });

    it('should set first step as goal-based', () => {
      const result = convertGeneratedToProcess(mockGeneratedTemplate);
      
      expect(result.stepTemplates![0].basis).toBe('goal');
      expect(result.stepTemplates![1].basis).toBe('prev');
      expect(result.stepTemplates![2].basis).toBe('prev');
    });

    it('should map dependencies correctly', () => {
      const result = convertGeneratedToProcess(mockGeneratedTemplate);
      
      expect(result.stepTemplates![0].dependsOn).toEqual([]);
      expect(result.stepTemplates![1].dependsOn).toEqual([1]); // step-1 is seq 1
      expect(result.stepTemplates![2].dependsOn).toEqual([2]); // step-2 is seq 2
    });

    it('should extract artifacts from description', () => {
      const result = convertGeneratedToProcess(mockGeneratedTemplate);
      
      // Should have at least default artifacts
      result.stepTemplates!.forEach(step => {
        expect(step.requiredArtifacts).toBeDefined();
        expect(step.requiredArtifacts.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty steps array', () => {
      const emptyTemplate: GeneratedTemplate = {
        ...mockGeneratedTemplate,
        steps: [],
      };

      const result = convertGeneratedToProcess(emptyTemplate);
      expect(result.stepTemplates).toEqual([]);
    });
  });

  describe('convertProcessToGenerated', () => {
    const mockProcessTemplate: ProcessTemplate = {
      id: 1,
      name: 'Existing Process',
      version: 2,
      isActive: true,
      stepTemplates: [
        {
          id: 1,
          seq: 1,
          name: 'Step One',
          basis: 'goal',
          offsetDays: 5,
          requiredArtifacts: [{ kind: 'document', description: 'Requirements' }],
          dependsOn: [],
        },
        {
          id: 2,
          seq: 2,
          name: 'Step Two',
          basis: 'prev',
          offsetDays: 3,
          requiredArtifacts: [{ kind: 'code' }],
          dependsOn: [1],
        },
      ],
    };

    it('should convert process template to AI format', () => {
      const result = convertProcessToGenerated(mockProcessTemplate);

      expect(result.id).toBe('template-1');
      expect(result.name).toBe('Existing Process');
      expect(result.description).toContain('Version 2');
      expect(result.steps).toHaveLength(2);
    });

    it('should include metadata when provided', () => {
      const metadata = {
        confidence: 0.9,
        sources: ['Source 1', 'Source 2'],
      };

      const result = convertProcessToGenerated(mockProcessTemplate, metadata);
      
      expect(result.metadata.confidence).toBe(0.9);
      expect(result.metadata.sources).toEqual(['Source 1', 'Source 2']);
      expect(result.metadata.version).toBe(2);
      expect(result.metadata.isActive).toBe(true);
    });

    it('should generate step descriptions', () => {
      const result = convertProcessToGenerated(mockProcessTemplate);
      
      expect(result.steps[0].description).toContain('Requirements');
      expect(result.steps[0].description).toContain('ゴールから5日前');
      expect(result.steps[1].description).toContain('前工程から3日後');
    });
  });

  describe('validateTemplateConversion', () => {
    it('should validate valid template', () => {
      const validTemplate: ProcessTemplate = {
        name: 'Valid Template',
        version: 1,
        isActive: true,
        stepTemplates: [
          {
            seq: 1,
            name: 'Step 1',
            basis: 'goal',
            offsetDays: 1,
            requiredArtifacts: [],
            dependsOn: [],
          },
        ],
      };

      const result = validateTemplateConversion(validTemplate);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty name', () => {
      const invalidTemplate: ProcessTemplate = {
        name: '',
        version: 1,
        isActive: true,
        stepTemplates: [],
      };

      const result = validateTemplateConversion(invalidTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('テンプレート名は必須です');
    });

    it('should detect empty steps', () => {
      const invalidTemplate: ProcessTemplate = {
        name: 'Template',
        version: 1,
        isActive: true,
        stepTemplates: [],
      };

      const result = validateTemplateConversion(invalidTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('少なくとも1つのステップが必要です');
    });

    it('should detect self-dependency', () => {
      const invalidTemplate: ProcessTemplate = {
        name: 'Template',
        version: 1,
        isActive: true,
        stepTemplates: [
          {
            seq: 1,
            name: 'Step 1',
            basis: 'goal',
            offsetDays: 1,
            requiredArtifacts: [],
            dependsOn: [1], // Self-dependency
          },
        ],
      };

      const result = validateTemplateConversion(invalidTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ステップ 1 は自分自身に依存できません');
    });

    it('should detect invalid dependency', () => {
      const invalidTemplate: ProcessTemplate = {
        name: 'Template',
        version: 1,
        isActive: true,
        stepTemplates: [
          {
            seq: 1,
            name: 'Step 1',
            basis: 'goal',
            offsetDays: 1,
            requiredArtifacts: [],
            dependsOn: [999], // Non-existent dependency
          },
        ],
      };

      const result = validateTemplateConversion(invalidTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ステップ 1 の依存先ステップ 999 が存在しません');
    });
  });

  describe('mergeAIMetadata', () => {
    it('should merge AI metadata with process template', () => {
      const processTemplate: ProcessTemplate = {
        name: 'Process',
        version: 1,
        isActive: true,
        stepTemplates: [],
      };

      const aiMetadata = {
        confidence: 0.95,
        sources: ['AI Source 1', 'AI Source 2'],
        extractedRequirements: [
          {
            category: 'Functional',
            content: 'Requirement 1',
            priority: 'High',
          },
        ],
      };

      const result = mergeAIMetadata(processTemplate, aiMetadata);
      
      expect(result.name).toBe('Process');
      expect(result.aiMetadata).toBeDefined();
      expect(result.aiMetadata.confidence).toBe(0.95);
      expect(result.aiMetadata.sources).toHaveLength(2);
      expect(result.aiMetadata.extractedRequirements).toHaveLength(1);
    });
  });
});