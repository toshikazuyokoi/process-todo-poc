export enum StepStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export class StepStatusValue {
  constructor(value: StepStatus | string) {
    // Convert string to lowercase for comparison
    const normalizedValue = typeof value === 'string' ? value.toLowerCase() : value;
    
    if (!Object.values(StepStatus).includes(normalizedValue as StepStatus)) {
      throw new Error(`Invalid step status value: ${value}`);
    }
    
    this.value = normalizedValue as StepStatus;
  }
  
  private readonly value: StepStatus;

  isTodo(): boolean {
    return this.value === StepStatus.TODO;
  }

  isInProgress(): boolean {
    return this.value === StepStatus.IN_PROGRESS;
  }

  isDone(): boolean {
    return this.value === StepStatus.DONE;
  }

  isBlocked(): boolean {
    return this.value === StepStatus.BLOCKED;
  }

  isCancelled(): boolean {
    return this.value === StepStatus.CANCELLED;
  }

  canTransitionTo(newStatus: StepStatus): boolean {
    const transitions: Record<StepStatus, StepStatus[]> = {
      [StepStatus.TODO]: [StepStatus.IN_PROGRESS, StepStatus.BLOCKED, StepStatus.CANCELLED],
      [StepStatus.IN_PROGRESS]: [StepStatus.DONE, StepStatus.TODO, StepStatus.BLOCKED, StepStatus.CANCELLED],
      [StepStatus.DONE]: [],
      [StepStatus.BLOCKED]: [StepStatus.TODO, StepStatus.IN_PROGRESS, StepStatus.CANCELLED],
      [StepStatus.CANCELLED]: [StepStatus.TODO],
    };

    return transitions[this.value].includes(newStatus);
  }

  toString(): string {
    return this.value;
  }

  getValue(): StepStatus {
    return this.value;
  }
}