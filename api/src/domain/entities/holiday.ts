export class Holiday {
  private date: Date;

  constructor(
    private readonly countryCode: string,
    date: Date | string,
    private name: string | null,
  ) {
    this.date = new Date(date);
    if (isNaN(this.date.getTime())) {
      throw new Error('Invalid holiday date');
    }
    this.date.setHours(0, 0, 0, 0);
    
    if (!this.isValidCountryCode(countryCode)) {
      throw new Error('Invalid country code');
    }
  }

  getCountryCode(): string {
    return this.countryCode;
  }

  getDate(): Date {
    return new Date(this.date);
  }

  getName(): string | null {
    return this.name;
  }

  isOnDate(date: Date): boolean {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return this.date.getTime() === compareDate.getTime();
  }

  getYear(): number {
    return this.date.getFullYear();
  }

  getMonth(): number {
    return this.date.getMonth() + 1;
  }

  getDay(): number {
    return this.date.getDate();
  }

  getDayOfWeek(): number {
    return this.date.getDay();
  }

  isWeekend(): boolean {
    const day = this.getDayOfWeek();
    return day === 0 || day === 6;
  }

  private isValidCountryCode(code: string): boolean {
    return /^[A-Z]{2}$/.test(code);
  }

  static createJapaneseHoliday(date: Date | string, name: string): Holiday {
    return new Holiday('JP', date, name);
  }

  static getJapaneseHolidaysForYear(year: number): Holiday[] {
    const holidays: Holiday[] = [];
    
    holidays.push(new Holiday('JP', new Date(year, 0, 1), '元日'));
    holidays.push(new Holiday('JP', new Date(year, 0, 2), '振替休日'));
    holidays.push(new Holiday('JP', new Date(year, 1, 11), '建国記念の日'));
    holidays.push(new Holiday('JP', new Date(year, 1, 23), '天皇誕生日'));
    holidays.push(new Holiday('JP', new Date(year, 3, 29), '昭和の日'));
    holidays.push(new Holiday('JP', new Date(year, 4, 3), '憲法記念日'));
    holidays.push(new Holiday('JP', new Date(year, 4, 4), 'みどりの日'));
    holidays.push(new Holiday('JP', new Date(year, 4, 5), 'こどもの日'));
    holidays.push(new Holiday('JP', new Date(year, 10, 3), '文化の日'));
    holidays.push(new Holiday('JP', new Date(year, 10, 23), '勤労感謝の日'));
    
    return holidays;
  }
}