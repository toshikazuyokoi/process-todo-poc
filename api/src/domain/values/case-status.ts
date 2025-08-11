export enum CaseStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export class CaseStatusValue {
  constructor(private readonly value: CaseStatus) {
    if (!Object.values(CaseStatus).includes(value)) {
      throw new Error(`Invalid case status value: ${value}`);
    }
  }

  isOpen(): boolean {
    return this.value === CaseStatus.OPEN;
  }

  isInProgress(): boolean {
    return this.value === CaseStatus.IN_PROGRESS;
  }

  isCompleted(): boolean {
    return this.value === CaseStatus.COMPLETED;
  }

  isCancelled(): boolean {
    return this.value === CaseStatus.CANCELLED;
  }

  isOnHold(): boolean {
    return this.value === CaseStatus.ON_HOLD;
  }

  isActive(): boolean {
    return this.value === CaseStatus.OPEN || this.value === CaseStatus.IN_PROGRESS;
  }

  canTransitionTo(newStatus: CaseStatus): boolean {
    const transitions: Record<CaseStatus, CaseStatus[]> = {
      [CaseStatus.OPEN]: [CaseStatus.IN_PROGRESS, CaseStatus.ON_HOLD, CaseStatus.CANCELLED],
      [CaseStatus.IN_PROGRESS]: [CaseStatus.COMPLETED, CaseStatus.ON_HOLD, CaseStatus.CANCELLED],
      [CaseStatus.COMPLETED]: [],
      [CaseStatus.CANCELLED]: [],
      [CaseStatus.ON_HOLD]: [CaseStatus.IN_PROGRESS, CaseStatus.CANCELLED],
    };

    return transitions[this.value].includes(newStatus);
  }

  toString(): string {
    return this.value;
  }

  getValue(): CaseStatus {
    return this.value;
  }
}