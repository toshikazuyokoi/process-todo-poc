export class Offset {
  constructor(private readonly days: number) {
    if (!Number.isInteger(days)) {
      throw new Error('Offset days must be an integer');
    }
    if (days < -365 || days > 365) {
      throw new Error('Offset days must be between -365 and 365');
    }
  }

  getDays(): number {
    return this.days;
  }

  isNegative(): boolean {
    return this.days < 0;
  }

  isPositive(): boolean {
    return this.days > 0;
  }

  isZero(): boolean {
    return this.days === 0;
  }

  add(other: Offset): Offset {
    return new Offset(this.days + other.days);
  }

  negate(): Offset {
    return new Offset(-this.days);
  }

  toString(): string {
    return `${this.days} days`;
  }
}