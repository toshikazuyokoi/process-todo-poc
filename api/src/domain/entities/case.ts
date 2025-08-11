import { CaseStatus, CaseStatusValue } from '../values/case-status';
import { DueDate } from '../values/due-date';
import { StepInstance } from './step-instance';

export class Case {
  private status: CaseStatusValue;
  private goalDate: DueDate;
  private _stepInstances: StepInstance[] = [];

  constructor(
    private readonly id: number | null,
    private readonly processId: number,
    private title: string,
    goalDateUtc: Date | string,
    status: CaseStatus | string,
    private readonly createdBy: number | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    this.goalDate = new DueDate(goalDateUtc);
    this.status = new CaseStatusValue(typeof status === 'string' ? (status as CaseStatus) : status);
  }

  getId(): number | null {
    return this.id;
  }

  getProcessId(): number {
    return this.processId;
  }

  getTitle(): string {
    return this.title;
  }

  getGoalDate(): DueDate {
    return this.goalDate;
  }

  getStatus(): CaseStatusValue {
    return this.status;
  }

  getCreatedBy(): number | null {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getStepInstances(): StepInstance[] {
    return [...this._stepInstances];
  }

  setStepInstances(stepInstances: StepInstance[]): void {
    this._stepInstances = [...stepInstances];
  }

  addStepInstance(stepInstance: StepInstance): void {
    this._stepInstances.push(stepInstance);
  }

  removeStepInstance(stepInstanceId: number): void {
    this._stepInstances = this._stepInstances.filter((si) => si.getId() !== stepInstanceId);
  }

  updateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Case title cannot be empty');
    }
    this.title = title;
    this.updatedAt = new Date();
  }

  updateGoalDate(goalDate: Date | string): void {
    this.goalDate = new DueDate(goalDate);
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: CaseStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status.getValue()} to ${newStatus}`,
      );
    }
    this.status = new CaseStatusValue(newStatus);
    this.updatedAt = new Date();
  }

  start(): void {
    this.updateStatus(CaseStatus.IN_PROGRESS);
  }

  complete(): void {
    const allStepsCompleted = this._stepInstances.every((si) => si.getStatus().isDone());
    if (!allStepsCompleted) {
      throw new Error('Cannot complete case with uncompleted steps');
    }
    this.updateStatus(CaseStatus.COMPLETED);
  }

  cancel(): void {
    if (this.status.isCompleted()) {
      throw new Error('Cannot cancel a completed case');
    }
    this.updateStatus(CaseStatus.CANCELLED);
  }

  putOnHold(): void {
    if (!this.status.isActive()) {
      throw new Error('Can only put active cases on hold');
    }
    this.updateStatus(CaseStatus.ON_HOLD);
  }

  resume(): void {
    if (!this.status.isOnHold()) {
      throw new Error('Can only resume cases that are on hold');
    }
    this.updateStatus(CaseStatus.IN_PROGRESS);
  }

  getProgress(): number {
    if (this._stepInstances.length === 0) {
      return 0;
    }
    const completedSteps = this._stepInstances.filter((si) => si.getStatus().isDone()).length;
    return Math.round((completedSteps / this._stepInstances.length) * 100);
  }

  getDelayedSteps(): StepInstance[] {
    const now = new Date();
    return this._stepInstances.filter((si) => {
      const dueDate = si.getDueDate();
      return dueDate && dueDate.getDate() < now && !si.getStatus().isDone();
    });
  }

  getUpcomingSteps(days: number = 7): StepInstance[] {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this._stepInstances.filter((si) => {
      const dueDate = si.getDueDate();
      if (!dueDate || si.getStatus().isDone()) {
        return false;
      }
      const date = dueDate.getDate();
      return date >= now && date <= futureDate;
    });
  }

  isActive(): boolean {
    return this.status.isActive();
  }

  isCompleted(): boolean {
    return this.status.isCompleted();
  }

  isCancelled(): boolean {
    return this.status.isCancelled();
  }

  isOnHold(): boolean {
    return this.status.isOnHold();
  }
}