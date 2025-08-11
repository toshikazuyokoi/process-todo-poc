import { Holiday } from '../entities/holiday';

export interface IHolidayRepository {
  findByCountryAndDateRange(
    countryCode: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Holiday[]>;
  findByCountryAndYear(countryCode: string, year: number): Promise<Holiday[]>;
  save(holiday: Holiday): Promise<Holiday>;
  saveMany(holidays: Holiday[]): Promise<Holiday[]>;
  delete(countryCode: string, date: Date): Promise<void>;
  deleteByCountryAndYear(countryCode: string, year: number): Promise<void>;
}