import { Case } from './case';
import { StepInstance } from './step-instance';
import { CaseStatus } from '../values/case-status';
import { StepStatus } from '../values/step-status';

describe('Case', () => {
  let caseEntity: Case;

  beforeEach(() => {
    caseEntity = new Case(
      1,
      1,
      'Test Case',
      new Date('2024-12-31'),
      CaseStatus.OPEN,
      1,
      new Date(),
      new Date(),
    );
  });

  describe('status transitions', () => {
    it('should transition from OPEN to IN_PROGRESS', () => {
      caseEntity.start();
      expect(caseEntity.getStatus().getValue()).toBe(CaseStatus.IN_PROGRESS);
    });

    it('should not allow transition from COMPLETED to any other status', () => {
      const completedCase = new Case(
        2,
        1,
        'Completed Case',
        new Date('2024-12-31'),
        CaseStatus.COMPLETED,
        1,
        new Date(),
        new Date(),
      );

      expect(() => completedCase.updateStatus(CaseStatus.IN_PROGRESS)).toThrow();
    });

    it('should complete case when all steps are done', () => {
      const step1 = new StepInstance(
        1,
        1,
        1,
        'Step 1',
        null,
        new Date('2024-12-15'),
        null,
        StepStatus.DONE,
        false,
        new Date(),
        new Date(),
      );

      const step2 = new StepInstance(
        2,
        1,
        2,
        'Step 2',
        null,
        new Date('2024-12-20'),
        null,
        StepStatus.DONE,
        false,
        new Date(),
        new Date(),
      );

      caseEntity.setStepInstances([step1, step2]);
      caseEntity.start();
      caseEntity.complete();

      expect(caseEntity.getStatus().getValue()).toBe(CaseStatus.COMPLETED);
    });

    it('should not complete case with uncompleted steps', () => {
      const step1 = new StepInstance(
        1,
        1,
        1,
        'Step 1',
        null,
        new Date('2024-12-15'),
        null,
        StepStatus.TODO,
        false,
        new Date(),
        new Date(),
      );

      caseEntity.setStepInstances([step1]);
      caseEntity.start();

      expect(() => caseEntity.complete()).toThrow('Cannot complete case with uncompleted steps');
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress correctly', () => {
      const step1 = new StepInstance(
        1,
        1,
        1,
        'Step 1',
        null,
        new Date('2024-12-15'),
        null,
        StepStatus.DONE,
        false,
        new Date(),
        new Date(),
      );

      const step2 = new StepInstance(
        2,
        1,
        2,
        'Step 2',
        null,
        new Date('2024-12-20'),
        null,
        StepStatus.IN_PROGRESS,
        false,
        new Date(),
        new Date(),
      );

      const step3 = new StepInstance(
        3,
        1,
        3,
        'Step 3',
        null,
        new Date('2024-12-25'),
        null,
        StepStatus.TODO,
        false,
        new Date(),
        new Date(),
      );

      caseEntity.setStepInstances([step1, step2, step3]);

      expect(caseEntity.getProgress()).toBe(33); // 1 out of 3 completed
    });

    it('should return 0 progress when no steps', () => {
      expect(caseEntity.getProgress()).toBe(0);
    });

    it('should return 100 progress when all steps completed', () => {
      const step1 = new StepInstance(
        1,
        1,
        1,
        'Step 1',
        null,
        new Date('2024-12-15'),
        null,
        StepStatus.DONE,
        false,
        new Date(),
        new Date(),
      );

      const step2 = new StepInstance(
        2,
        1,
        2,
        'Step 2',
        null,
        new Date('2024-12-20'),
        null,
        StepStatus.DONE,
        false,
        new Date(),
        new Date(),
      );

      caseEntity.setStepInstances([step1, step2]);

      expect(caseEntity.getProgress()).toBe(100);
    });
  });

  describe('delayed steps', () => {
    it('should identify delayed steps', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const delayedStep = new StepInstance(
        1,
        1,
        1,
        'Delayed Step',
        null,
        pastDate,
        null,
        StepStatus.TODO,
        false,
        new Date(),
        new Date(),
      );

      const onTimeStep = new StepInstance(
        2,
        1,
        2,
        'On Time Step',
        null,
        futureDate,
        null,
        StepStatus.TODO,
        false,
        new Date(),
        new Date(),
      );

      const completedStep = new StepInstance(
        3,
        1,
        3,
        'Completed Step',
        null,
        pastDate,
        null,
        StepStatus.DONE,
        false,
        new Date(),
        new Date(),
      );

      caseEntity.setStepInstances([delayedStep, onTimeStep, completedStep]);

      const delayed = caseEntity.getDelayedSteps();
      expect(delayed).toHaveLength(1);
      expect(delayed[0].getName()).toBe('Delayed Step');
    });
  });

  describe('upcoming steps', () => {
    it('should identify upcoming steps within specified days', () => {
      const in3Days = new Date();
      in3Days.setDate(in3Days.getDate() + 3);

      const in10Days = new Date();
      in10Days.setDate(in10Days.getDate() + 10);

      const upcomingStep = new StepInstance(
        1,
        1,
        1,
        'Upcoming Step',
        null,
        in3Days,
        null,
        StepStatus.TODO,
        false,
        new Date(),
        new Date(),
      );

      const farFutureStep = new StepInstance(
        2,
        1,
        2,
        'Far Future Step',
        null,
        in10Days,
        null,
        StepStatus.TODO,
        false,
        new Date(),
        new Date(),
      );

      caseEntity.setStepInstances([upcomingStep, farFutureStep]);

      const upcoming = caseEntity.getUpcomingSteps(7);
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].getName()).toBe('Upcoming Step');
    });
  });
});