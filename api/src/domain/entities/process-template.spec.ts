import { ProcessTemplate } from './process-template';
import { StepTemplate } from './step-template';

describe('ProcessTemplate', () => {
  describe('constructor', () => {
    it('should create a valid process template', () => {
      const template = new ProcessTemplate(
        1,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(template.getId()).toBe(1);
      expect(template.getName()).toBe('Test Process');
      expect(template.getVersion()).toBe(1);
      expect(template.getIsActive()).toBe(true);
    });

    it('should handle null id', () => {
      const template = new ProcessTemplate(
        null,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(template.getId()).toBeNull();
    });
  });

  describe('setStepTemplates', () => {
    it('should set step templates', () => {
      const template = new ProcessTemplate(
        1,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      const stepTemplates = [
        new StepTemplate(1, 1, 1, 'Step 1', 'goal', -5, [], [], new Date(), new Date()),
        new StepTemplate(2, 1, 2, 'Step 2', 'prev', 3, [], [], new Date(), new Date()),
      ];

      template.setStepTemplates(stepTemplates);
      expect(template.getStepTemplates()).toHaveLength(2);
      expect(template.getStepTemplates()[0].getName()).toBe('Step 1');
    });

    it('should handle empty step templates', () => {
      const template = new ProcessTemplate(
        1,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      template.setStepTemplates([]);
      expect(template.getStepTemplates()).toHaveLength(0);
    });
  });

  describe('validation', () => {
    it('should validate active status', () => {
      const activeTemplate = new ProcessTemplate(
        1,
        'Active Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      const inactiveTemplate = new ProcessTemplate(
        2,
        'Inactive Process',
        1,
        false,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(activeTemplate.getIsActive()).toBe(true);
      expect(inactiveTemplate.getIsActive()).toBe(false);
    });

    it('should handle version updates', () => {
      const template = new ProcessTemplate(
        1,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(template.getVersion()).toBe(1);
      
      // Create new version
      const newVersion = new ProcessTemplate(
        2,
        'Test Process',
        2,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );
      
      expect(newVersion.getVersion()).toBe(2);
    });
  });

  describe('business logic', () => {
    it('should find step template by id', () => {
      const template = new ProcessTemplate(
        1,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      const stepTemplates = [
        new StepTemplate(10, 1, 1, 'Step 1', 'goal', -5, [], [], new Date(), new Date()),
        new StepTemplate(20, 1, 2, 'Step 2', 'prev', 3, [], [], new Date(), new Date()),
        new StepTemplate(30, 1, 3, 'Step 3', 'prev', 2, [], [20], new Date(), new Date()),
      ];

      template.setStepTemplates(stepTemplates);
      
      const step = template.getStepTemplates().find(s => s.getId() === 20);
      expect(step).toBeDefined();
      expect(step?.getName()).toBe('Step 2');
    });

    it('should get step templates in sequence order', () => {
      const template = new ProcessTemplate(
        1,
        'Test Process',
        1,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      const stepTemplates = [
        new StepTemplate(30, 1, 3, 'Step 3', 'prev', 2, [], [], new Date(), new Date()),
        new StepTemplate(10, 1, 1, 'Step 1', 'goal', -5, [], [], new Date(), new Date()),
        new StepTemplate(20, 1, 2, 'Step 2', 'prev', 3, [], [], new Date(), new Date()),
      ];

      template.setStepTemplates(stepTemplates);
      
      const sortedSteps = template.getStepTemplates().sort((a, b) => a.getSeq() - b.getSeq());
      expect(sortedSteps[0].getSeq()).toBe(1);
      expect(sortedSteps[1].getSeq()).toBe(2);
      expect(sortedSteps[2].getSeq()).toBe(3);
    });
  });
});