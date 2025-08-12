import { StepTemplate, RequiredArtifact } from './step-template';
import { Offset } from '../values/offset';

describe('StepTemplate', () => {
  describe('constructor', () => {
    it('should create a valid step template', () => {
      const artifacts: RequiredArtifact[] = [
        { kind: 'doc1', description: 'Document 1' },
        { kind: 'doc2', description: 'Document 2' },
      ];
      
      const step = new StepTemplate(
        1,
        100,
        1,
        'Test Step',
        'goal',
        -5,
        artifacts,
        [],
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(step.getId()).toBe(1);
      expect(step.getProcessId()).toBe(100);
      expect(step.getSeq()).toBe(1);
      expect(step.getName()).toBe('Test Step');
      expect(step.getBasis().isGoal()).toBe(true);
      expect(step.getOffset().getDays()).toBe(-5);
      expect(step.getRequiredArtifacts()).toEqual(artifacts);
      expect(step.getDependsOn()).toEqual([]);
    });

    it('should handle null id', () => {
      const step = new StepTemplate(
        null,
        100,
        1,
        'Test Step',
        'prev',
        3,
        [],
        [1, 2],
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(step.getId()).toBeNull();
      expect(step.getBasis().isGoal()).toBe(false);
      expect(step.getDependsOn()).toEqual([1, 2]);
    });

    it('should handle JSON string for artifacts and dependencies', () => {
      const artifacts: RequiredArtifact[] = [
        { kind: 'contract' },
        { kind: 'proposal' },
      ];
      
      const step = new StepTemplate(
        1,
        100,
        1,
        'Test Step',
        'goal',
        -5,
        JSON.stringify(artifacts),
        JSON.stringify([3, 4]),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(step.getRequiredArtifacts()).toEqual(artifacts);
      expect(step.getDependsOn()).toEqual([3, 4]);
    });
  });

  describe('basis type', () => {
    it('should correctly identify goal-based steps', () => {
      const goalStep = new StepTemplate(
        1,
        100,
        1,
        'Goal Step',
        'goal',
        -10,
        [],
        [],
        new Date(),
        new Date(),
      );

      expect(goalStep.getBasis().isGoal()).toBe(true);
      expect(goalStep.getBasis().toString()).toBe('goal');
    });

    it('should correctly identify prev-based steps', () => {
      const prevStep = new StepTemplate(
        2,
        100,
        2,
        'Prev Step',
        'prev',
        5,
        [],
        [1],
        new Date(),
        new Date(),
      );

      expect(prevStep.getBasis().isGoal()).toBe(false);
      expect(prevStep.getBasis().toString()).toBe('prev');
    });
  });

  describe('offset', () => {
    it('should handle negative offsets for goal-based steps', () => {
      const step = new StepTemplate(
        1,
        100,
        1,
        'Test Step',
        'goal',
        -15,
        [],
        [],
        new Date(),
        new Date(),
      );

      expect(step.getOffset().getDays()).toBe(-15);
    });

    it('should handle positive offsets for prev-based steps', () => {
      const step = new StepTemplate(
        2,
        100,
        2,
        'Test Step',
        'prev',
        7,
        [],
        [1],
        new Date(),
        new Date(),
      );

      expect(step.getOffset().getDays()).toBe(7);
    });

    it('should handle zero offset', () => {
      const step = new StepTemplate(
        3,
        100,
        3,
        'Test Step',
        'goal',
        0,
        [],
        [],
        new Date(),
        new Date(),
      );

      expect(step.getOffset().getDays()).toBe(0);
    });
  });

  describe('dependencies', () => {
    it('should handle multiple dependencies', () => {
      const step = new StepTemplate(
        5,
        100,
        5,
        'Multi Dependency Step',
        'prev',
        2,
        [],
        [1, 2, 3, 4],
        new Date(),
        new Date(),
      );

      expect(step.getDependsOn()).toHaveLength(4);
      expect(step.getDependsOn()).toContain(1);
      expect(step.getDependsOn()).toContain(4);
    });

    it('should handle no dependencies for goal-based steps', () => {
      const step = new StepTemplate(
        1,
        100,
        1,
        'No Dependency Step',
        'goal',
        -5,
        [],
        [],
        new Date(),
        new Date(),
      );

      expect(step.getDependsOn()).toHaveLength(0);
    });
  });

  describe('required artifacts', () => {
    it('should store required artifact types', () => {
      const artifacts: RequiredArtifact[] = [
        { kind: 'contract', description: 'Sales contract' },
        { kind: 'proposal', description: 'Project proposal' },
        { kind: 'specification', description: 'Technical specification' },
      ];
      
      const step = new StepTemplate(
        1,
        100,
        1,
        'Document Step',
        'goal',
        -10,
        artifacts,
        [],
        new Date(),
        new Date(),
      );

      expect(step.getRequiredArtifacts()).toEqual(artifacts);
      expect(step.getRequiredArtifacts()).toHaveLength(3);
    });

    it('should handle empty artifacts', () => {
      const step = new StepTemplate(
        1,
        100,
        1,
        'No Artifact Step',
        'goal',
        -5,
        [],
        [],
        new Date(),
        new Date(),
      );

      expect(step.getRequiredArtifacts()).toEqual([]);
      expect(step.getRequiredArtifacts()).toHaveLength(0);
    });
  });

  describe('validation', () => {
    it('should have valid sequence number', () => {
      const step1 = new StepTemplate(
        1,
        100,
        1,
        'First Step',
        'goal',
        -10,
        [],
        [],
        new Date(),
        new Date(),
      );

      const step2 = new StepTemplate(
        2,
        100,
        2,
        'Second Step',
        'prev',
        3,
        [],
        [1],
        new Date(),
        new Date(),
      );

      expect(step1.getSeq()).toBe(1);
      expect(step2.getSeq()).toBe(2);
      expect(step2.getSeq()).toBeGreaterThan(step1.getSeq());
    });

    it('should belong to correct process', () => {
      const processId = 999;
      const step = new StepTemplate(
        1,
        processId,
        1,
        'Process Step',
        'goal',
        -5,
        [],
        [],
        new Date(),
        new Date(),
      );

      expect(step.getProcessId()).toBe(processId);
    });
  });
});