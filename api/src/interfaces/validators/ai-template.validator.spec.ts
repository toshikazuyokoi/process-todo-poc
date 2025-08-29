import { AITemplateValidator } from './ai-template.validator';
import { 
  TemplateRecommendationDto, 
  StepRecommendationDto 
} from '../../application/dto/ai-agent/template-recommendation.dto';
import { VALIDATION_CONSTANTS } from './validation.constants';
import { ComplexityLevel } from '../../domain/ai-agent/entities/process-analysis.entity';

describe('AITemplateValidator', () => {
  let validator: AITemplateValidator;

  beforeEach(() => {
    validator = new AITemplateValidator();
  });

  const createStep = (id: string): StepRecommendationDto => ({
    id,
    name: `Step ${id}`,
    description: `Description for step ${id}`,
    duration: 8,
    dependencies: [],
    artifacts: ['artifact1'],
    responsible: 'Developer',
    criticalPath: true,
  });

  const createValidTemplate = (): TemplateRecommendationDto => ({
    id: 'template-123',
    name: 'Test Template',
    description: 'A test template',
    steps: [createStep('1'), createStep('2')],
    confidence: 0.85,
    rationale: ['Based on best practices'],
    estimatedDuration: 160,
    complexity: ComplexityLevel.MEDIUM,
  });

  describe('validate', () => {
    it('should return valid result for valid template', async () => {
      const dto = createValidTemplate();
      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return error when template has no steps', async () => {
      const dto = createValidTemplate();
      dto.steps = [];

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template must have at least one step');
    });

    it('should return error when steps exceed maximum limit', async () => {
      const dto = createValidTemplate();
      dto.steps = Array.from(
        { length: VALIDATION_CONSTANTS.MAX_STEPS_PER_TEMPLATE + 1 },
        (_, i) => createStep(String(i)),
      );

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Number of steps exceeds maximum limit of ${VALIDATION_CONSTANTS.MAX_STEPS_PER_TEMPLATE}`,
      );
    });

    it('should accept template with exactly maximum steps', async () => {
      const dto = createValidTemplate();
      dto.steps = Array.from(
        { length: VALIDATION_CONSTANTS.MAX_STEPS_PER_TEMPLATE },
        (_, i) => createStep(String(i)),
      );

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return error when confidence score is below minimum', async () => {
      const dto = createValidTemplate();
      dto.confidence = VALIDATION_CONSTANTS.MIN_CONFIDENCE_SCORE - 0.01;

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Confidence score is below minimum requirement of ${VALIDATION_CONSTANTS.MIN_CONFIDENCE_SCORE}`,
      );
    });

    it('should accept confidence score at minimum threshold', async () => {
      const dto = createValidTemplate();
      dto.confidence = VALIDATION_CONSTANTS.MIN_CONFIDENCE_SCORE;

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate alternatives when present', async () => {
      const dto = createValidTemplate();
      const invalidAlternative = createValidTemplate();
      invalidAlternative.confidence = 0.05; // Below minimum

      dto.alternatives = [invalidAlternative];

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Alternative 1: Confidence score is below minimum requirement of ${VALIDATION_CONSTANTS.MIN_CONFIDENCE_SCORE}`,
      );
    });

    it('should validate multiple alternatives', async () => {
      const dto = createValidTemplate();
      const alternative1 = createValidTemplate();
      const alternative2 = createValidTemplate();
      alternative2.steps = []; // No steps

      dto.alternatives = [alternative1, alternative2];

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContain('Alternative 2: Template must have at least one step');
    });

    it('should return multiple errors for invalid template', async () => {
      const dto = createValidTemplate();
      dto.steps = [];
      dto.confidence = 0.05;

      const result = await validator.validate(dto);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Template must have at least one step');
      expect(result.errors).toContain(
        `Confidence score is below minimum requirement of ${VALIDATION_CONSTANTS.MIN_CONFIDENCE_SCORE}`,
      );
    });
  });

  describe('future implementation placeholders', () => {
    it('should have detectCircularDependencies method (currently returns false)', () => {
      const validator = new AITemplateValidator();
      const steps = [createStep('1'), createStep('2')];
      
      // Access private method for documentation purposes
      const detectMethod = (validator as any).detectCircularDependencies;
      expect(detectMethod).toBeDefined();
      
      // Currently always returns false (minimal implementation)
      const result = detectMethod.call(validator, steps);
      expect(result).toBe(false);
    });
  });
});