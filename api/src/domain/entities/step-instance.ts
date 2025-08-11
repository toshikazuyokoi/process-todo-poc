import { StepStatus, StepStatusValue } from '../values/step-status';
import { DueDate } from '../values/due-date';
import { Artifact } from './artifact';

export class StepInstance {
  private status: StepStatusValue;
  private dueDate: DueDate | null;
  private _artifacts: Artifact[] = [];

  constructor(
    private readonly id: number | null,
    private readonly caseId: number,
    private readonly templateId: number | null,
    private name: string,
    dueDateUtc: Date | string | null,
    private assigneeId: number | null,
    status: StepStatus | string,
    private locked: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    this.status = new StepStatusValue(status);
    this.dueDate = dueDateUtc ? new DueDate(dueDateUtc) : null;
  }

  getId(): number | null {
    return this.id;
  }

  getCaseId(): number {
    return this.caseId;
  }

  getTemplateId(): number | null {
    return this.templateId;
  }

  getName(): string {
    return this.name;
  }

  getDueDate(): DueDate | null {
    return this.dueDate;
  }

  getAssigneeId(): number | null {
    return this.assigneeId;
  }

  getStatus(): StepStatusValue {
    return this.status;
  }

  isLocked(): boolean {
    return this.locked;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getArtifacts(): Artifact[] {
    return [...this._artifacts];
  }

  setArtifacts(artifacts: Artifact[]): void {
    this._artifacts = [...artifacts];
  }

  addArtifact(artifact: Artifact): void {
    this._artifacts.push(artifact);
  }

  removeArtifact(artifactId: number): void {
    this._artifacts = this._artifacts.filter((a) => a.getId() !== artifactId);
  }

  updateName(name: string): void {
    if (this.locked) {
      throw new Error('Cannot update a locked step');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Step name cannot be empty');
    }
    this.name = name;
    this.updatedAt = new Date();
  }

  updateDueDate(dueDate: Date | string | null): void {
    if (this.locked && !this.status.isDone()) {
      throw new Error('Cannot update due date of a locked step');
    }
    this.dueDate = dueDate ? new DueDate(dueDate) : null;
    this.updatedAt = new Date();
  }

  assignTo(userId: number | null): void {
    this.assigneeId = userId;
    this.updatedAt = new Date();
  }

  setAssigneeId(userId: number | null): void {
    this.assignTo(userId);
  }

  updateStatus(newStatus: StepStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status.getValue()} to ${newStatus}`,
      );
    }
    this.status = new StepStatusValue(newStatus);
    this.updatedAt = new Date();
  }

  start(): void {
    this.updateStatus(StepStatus.IN_PROGRESS);
  }

  complete(): void {
    const hasAllRequiredArtifacts = this.hasAllRequiredArtifacts();
    if (!hasAllRequiredArtifacts) {
      throw new Error('Cannot complete step without all required artifacts');
    }
    this.updateStatus(StepStatus.DONE);
  }

  block(): void {
    this.updateStatus(StepStatus.BLOCKED);
  }

  unblock(): void {
    if (!this.status.isBlocked()) {
      throw new Error('Can only unblock blocked steps');
    }
    this.updateStatus(StepStatus.TODO);
  }

  cancel(): void {
    this.updateStatus(StepStatus.CANCELLED);
  }

  lock(): void {
    this.locked = true;
    this.updatedAt = new Date();
  }

  unlock(): void {
    this.locked = false;
    this.updatedAt = new Date();
  }

  isOverdue(): boolean {
    if (!this.dueDate || this.status.isDone()) {
      return false;
    }
    return this.dueDate.getDate() < new Date();
  }

  getDaysUntilDue(): number | null {
    if (!this.dueDate) {
      return null;
    }
    const now = new Date();
    const diffTime = this.dueDate.getDate().getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  hasAllRequiredArtifacts(): boolean {
    const requiredArtifacts = this._artifacts.filter((a) => a.isRequired());
    return requiredArtifacts.length > 0 && requiredArtifacts.every((a) => a.getId() !== null);
  }

  canBeStarted(): boolean {
    return this.status.isTodo() && !this.locked;
  }

  canBeCompleted(): boolean {
    return this.status.isInProgress() && this.hasAllRequiredArtifacts();
  }
}