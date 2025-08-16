import { StepInstance } from './step-instance';
import { StepStatus } from '../values/step-status';
import { DueDate } from '../values/due-date';

describe('StepInstance', () => {
  describe('constructor', () => {
    it('should create a valid step instance', () => {
      const dueDate = new Date('2025-12-31');
      const instance = new StepInstance(
        1,
        100,
        10,
        'Test Step',
        null,
        dueDate,
        null,
        StepStatus.TODO,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      expect(instance.getId()).toBe(1);
      expect(instance.getCaseId()).toBe(100);
      expect(instance.getTemplateId()).toBe(10);
      expect(instance.getName()).toBe('Test Step');
      expect(instance.getStatus().toString()).toBe(StepStatus.TODO);
      expect(instance.getDueDate()?.getDate()).toEqual(dueDate);
      expect(instance.isLocked()).toBe(true);
    });

    it('should handle null id', () => {
      const instance = new StepInstance(
        null,
        100,
        10,
        'Test Step',
        null,
        new Date('2025-12-31'),
        null,
        StepStatus.IN_PROGRESS,
        false,
        new Date(),
        new Date(),
      );

      expect(instance.getId()).toBeNull();
      expect(instance.getStatus().toString()).toBe(StepStatus.IN_PROGRESS);
      expect(instance.isLocked()).toBe(false);
    });
  });

  describe('status management', () => {
    it('should handle different status values', () => {
      const pendingInstance = new StepInstance(
        1, 100, 10, 'Pending Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );
      expect(pendingInstance.getStatus().toString()).toBe(StepStatus.TODO);

      const inProgressInstance = new StepInstance(
        2, 100, 11, 'In Progress Step',
        null,
        new Date(),
        null,
        StepStatus.IN_PROGRESS,
        false,
        new Date(), 
        new Date(),
      );
      expect(inProgressInstance.getStatus().toString()).toBe(StepStatus.IN_PROGRESS);

      const completedInstance = new StepInstance(
        3, 100, 12, 'Completed Step',
        null,
        new Date(),
        null,
        StepStatus.DONE,
        false,
        new Date(), 
        new Date(),
      );
      expect(completedInstance.getStatus().toString()).toBe(StepStatus.DONE);
    });

    it('should handle uppercase status from database', () => {
      // Simulating uppercase status from database
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        new Date(),
        null,
        'IN_PROGRESS' as any,
        false,
        new Date(), 
        new Date(),
      );

      // The StepStatusValue constructor should normalize it
      expect(instance.getStatus().toString()).toBe('in_progress');
    });
  });

  describe('due date management', () => {
    it('should handle due date', () => {
      const futureDate = new Date('2025-12-31');
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        futureDate,
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      const dueDate = instance.getDueDate();
      expect(dueDate).toBeDefined();
      expect(dueDate?.getDate()).toEqual(futureDate);
    });

    it('should handle null due date', () => {
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        null,
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      expect(instance.getDueDate()).toBeNull();
    });
  });

  describe('lock management', () => {
    it('should handle locked steps', () => {
      const lockedInstance = new StepInstance(
        1, 100, 10, 'Locked Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        true,
        new Date(), 
        new Date(),
      );

      expect(lockedInstance.isLocked()).toBe(true);
    });

    it('should handle unlocked steps', () => {
      const unlockedInstance = new StepInstance(
        1, 100, 10, 'Unlocked Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      expect(unlockedInstance.isLocked()).toBe(false);
    });
  });

  describe('business logic', () => {
    it('should identify overdue steps', () => {
      const pastDate = new Date('2024-01-01');
      const instance = new StepInstance(
        1, 100, 10, 'Overdue Step',
        null,
        pastDate,
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      expect(instance.isOverdue()).toBe(true);
    });

    it('should identify steps that can be modified', () => {
      const unlockedPending = new StepInstance(
        1, 100, 10, 'Modifiable Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      const lockedPending = new StepInstance(
        2, 100, 11, 'Locked Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        true,
        new Date(), 
        new Date(),
      );

      const completedStep = new StepInstance(
        3, 100, 12, 'Completed Step',
        null,
        new Date(),
        null,
        StepStatus.DONE,
        false,
        new Date(), 
        new Date(),
      );

      // Business logic: only unlocked, non-completed steps can be modified
      const canModifyUnlocked = !unlockedPending.isLocked() && 
        unlockedPending.getStatus().toString() !== StepStatus.DONE;
      const canModifyLocked = !lockedPending.isLocked() && 
        lockedPending.getStatus().toString() !== StepStatus.DONE;
      const canModifyCompleted = !completedStep.isLocked() && 
        completedStep.getStatus().toString() !== StepStatus.DONE;

      expect(canModifyUnlocked).toBe(true);
      expect(canModifyLocked).toBe(false);
      expect(canModifyCompleted).toBe(false);
    });

    it('should handle status transitions', () => {
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      // Can start from TODO
      expect(instance.canBeStarted()).toBe(true);
      
      // Start the step
      instance.start();
      expect(instance.getStatus().toString()).toBe(StepStatus.IN_PROGRESS);
      expect(instance.canBeStarted()).toBe(false);

      // Can't complete without artifacts (assuming hasAllRequiredArtifacts returns false)
      expect(instance.canBeCompleted()).toBe(false);
    });

    it('should calculate days until due', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
      
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        futureDate,
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      const daysUntilDue = instance.getDaysUntilDue();
      expect(daysUntilDue).toBeDefined();
      expect(daysUntilDue).toBeGreaterThanOrEqual(6); // At least 6 days (considering time)
      expect(daysUntilDue).toBeLessThanOrEqual(8); // At most 8 days
    });

    it('should handle locking and unlocking', () => {
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      expect(instance.isLocked()).toBe(false);
      
      instance.lock();
      expect(instance.isLocked()).toBe(true);
      
      instance.unlock();
      expect(instance.isLocked()).toBe(false);
    });

    it('should handle assignee management', () => {
      const instance = new StepInstance(
        1, 100, 10, 'Test Step',
        null,
        new Date(),
        null,
        StepStatus.TODO,
        false,
        new Date(), 
        new Date(),
      );

      expect(instance.getAssigneeId()).toBeNull();
      
      instance.assignTo(5);
      expect(instance.getAssigneeId()).toBe(5);
      
      instance.assignTo(null);
      expect(instance.getAssigneeId()).toBeNull();
    });
  });
});