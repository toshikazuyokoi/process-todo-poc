import { validate } from 'class-validator';
import { CreateStepTemplateDto } from './create-process-template.dto';

describe('CreateStepTemplateDto', () => {
  let dto: CreateStepTemplateDto;

  beforeEach(() => {
    dto = new CreateStepTemplateDto();
  });

  describe('seq validation', () => {
    it('should fail when seq is not a positive integer', async () => {
      dto.seq = -1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'seq')).toBe(true);
    });

    it('should fail when seq is zero', async () => {
      dto.seq = 0;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'seq')).toBe(true);
    });

    it('should pass with valid seq', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('name validation', () => {
    it('should fail when name is empty', async () => {
      dto.seq = 1;
      dto.name = '';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail when name is too long', async () => {
      dto.seq = 1;
      dto.name = 'a'.repeat(256);
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should pass with valid name including Japanese', async () => {
      dto.seq = 1;
      dto.name = 'リード獲得';
      dto.basis = 'goal';
      dto.offsetDays = -30;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('basis validation', () => {
    it('should fail with invalid basis value', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'invalid' as any;
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'basis')).toBe(true);
    });

    it('should pass with basis="goal"', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = -10;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with basis="prev"', async () => {
      dto.seq = 2;
      dto.name = 'Test Step';
      dto.basis = 'prev';
      dto.offsetDays = 3;
      dto.requiredArtifacts = [];
      dto.dependsOn = [1];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

  });

  describe('offsetDays validation', () => {
    it('should fail when offsetDays is less than -365', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = -366;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'offsetDays')).toBe(true);
    });

    it('should fail when offsetDays is greater than 365', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'prev';
      dto.offsetDays = 366;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'offsetDays')).toBe(true);
    });

    it('should pass with valid negative offsetDays for goal basis', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = -30;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid positive offsetDays for prev basis', async () => {
      dto.seq = 2;
      dto.name = 'Test Step';
      dto.basis = 'prev';
      dto.offsetDays = 5;
      dto.requiredArtifacts = [];
      dto.dependsOn = [1];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('requiredArtifacts validation', () => {
    it('should pass with empty requiredArtifacts', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid requiredArtifacts', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [
        { kind: 'document', description: 'Proposal' },
        { kind: 'presentation', description: 'Slide deck' },
      ];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass even with empty kind in artifact', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [
        { kind: '', description: 'Invalid' } as any, // Empty kind - no validation on nested objects
      ];
      dto.dependsOn = [];

      const errors = await validate(dto);
      // Note: Current DTO doesn't validate nested artifact properties
      expect(errors).toHaveLength(0);
    });
  });

  describe('dependsOn validation', () => {
    it('should pass with empty dependsOn', async () => {
      dto.seq = 1;
      dto.name = 'Test Step';
      dto.basis = 'goal';
      dto.offsetDays = 0;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid dependency references', async () => {
      dto.seq = 3;
      dto.name = 'Test Step';
      dto.basis = 'prev';
      dto.offsetDays = 2;
      dto.requiredArtifacts = [];
      dto.dependsOn = [1, 2];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass even with negative dependency references', async () => {
      dto.seq = 2;
      dto.name = 'Test Step';
      dto.basis = 'prev';
      dto.offsetDays = 1;
      dto.requiredArtifacts = [];
      dto.dependsOn = [-1, 0];

      const errors = await validate(dto);
      // Note: Current DTO doesn't validate individual array elements
      expect(errors).toHaveLength(0);
    });
  });

  describe('business logic validation', () => {
    it('should allow goal basis without dependencies', async () => {
      dto.seq = 1;
      dto.name = 'Goal Step';
      dto.basis = 'goal';
      dto.offsetDays = -10;
      dto.requiredArtifacts = [];
      dto.dependsOn = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow prev basis with dependencies', async () => {
      dto.seq = 2;
      dto.name = 'Dependent Step';
      dto.basis = 'prev';
      dto.offsetDays = 3;
      dto.requiredArtifacts = [];
      dto.dependsOn = [1];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow multiple dependencies', async () => {
      dto.seq = 4;
      dto.name = 'Multi-Dependent Step';
      dto.basis = 'prev';
      dto.offsetDays = 1;
      dto.requiredArtifacts = [];
      dto.dependsOn = [1, 2, 3];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});