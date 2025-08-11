export class DueDate {
  private readonly date: Date;

  constructor(date: Date | string | null | undefined) {
    // null や undefined のチェック
    if (date === null || date === undefined) {
      throw new Error(`Invalid date: ${date} (null or undefined)`);
    }
    
    this.date = new Date(date);
    
    // Invalid Date のチェック
    if (isNaN(this.date.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }
    
    // 1970年チェック（Unix エポック時の不正な値を検出）
    if (this.date.getFullYear() < 2000) {
      throw new Error(`Invalid date: ${date} (year ${this.date.getFullYear()} is before 2000)`);
    }
  }

  getDate(): Date {
    return new Date(this.date);
  }

  toISOString(): string {
    return this.date.toISOString();
  }

  isBefore(other: DueDate): boolean {
    return this.date < other.date;
  }

  isAfter(other: DueDate): boolean {
    return this.date > other.date;
  }

  isSameDay(other: DueDate): boolean {
    return (
      this.date.getFullYear() === other.date.getFullYear() &&
      this.date.getMonth() === other.date.getMonth() &&
      this.date.getDate() === other.date.getDate()
    );
  }

  addDays(days: number): DueDate {
    const newDate = new Date(this.date);
    newDate.setDate(newDate.getDate() + days);
    return new DueDate(newDate);
  }

  static today(): DueDate {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new DueDate(today);
  }

  getDayOfWeek(): number {
    return this.date.getDay();
  }

  isWeekend(): boolean {
    const day = this.getDayOfWeek();
    return day === 0 || day === 6;
  }
}