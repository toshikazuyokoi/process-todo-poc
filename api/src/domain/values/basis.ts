export enum Basis {
  GOAL = 'goal',
  PREV = 'prev',
}

export class BasisValue {
  constructor(private readonly value: Basis) {
    if (!Object.values(Basis).includes(value)) {
      throw new Error(`Invalid basis value: ${value}`);
    }
  }

  isGoal(): boolean {
    return this.value === Basis.GOAL;
  }

  isPrev(): boolean {
    return this.value === Basis.PREV;
  }

  toString(): string {
    return this.value;
  }

  getValue(): Basis {
    return this.value;
  }
}