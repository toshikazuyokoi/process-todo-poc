import { Injectable, Inject, Logger } from '@nestjs/common';
import { Holiday } from '../entities/holiday';
import { DueDate } from '../values/due-date';
import { IHolidayRepository } from '../repositories/holiday.repository.interface';

@Injectable()
export class BusinessDayService {
  private readonly logger = new Logger(BusinessDayService.name);
  
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async addBusinessDays(
    startDate: Date,
    businessDays: number,
    countryCode: string = 'JP',
  ): Promise<Date> {
    try {
      this.logger.debug(`addBusinessDays: startDate=${startDate.toISOString()}, businessDays=${businessDays}, countryCode=${countryCode}`);
      
      if (!startDate || isNaN(startDate.getTime())) {
        this.logger.error(`Invalid startDate provided: ${startDate}`);
        throw new Error(`Invalid startDate: ${startDate}`);
      }
      
      if (businessDays === 0) {
        return new Date(startDate);
      }

      const direction = businessDays > 0 ? 1 : -1;
      const daysToAdd = Math.abs(businessDays);
      
      const maxRange = Math.abs(businessDays) * 3;
      const searchStart = new Date(startDate);
      const searchEnd = new Date(startDate);
      
      if (direction > 0) {
        searchEnd.setDate(searchEnd.getDate() + maxRange);
      } else {
        searchStart.setDate(searchStart.getDate() - maxRange);
      }
      
      const holidays = await this.holidayRepository.findByCountryAndDateRange(
        countryCode,
        searchStart,
        searchEnd,
      );
      
      const holidaySet = new Set(
        holidays.map((h) => this.dateToString(h.getDate())),
      );
      
      let currentDate = new Date(startDate);
      let addedDays = 0;
      
      while (addedDays < daysToAdd) {
        currentDate.setDate(currentDate.getDate() + direction);
        
        if (this.isBusinessDaySync(currentDate, holidaySet)) {
          addedDays++;
        }
      }
      
      this.logger.debug(`addBusinessDays result: ${currentDate.toISOString()}`);
      return currentDate;
    } catch (error) {
      this.logger.error(`Error in addBusinessDays: ${error.message}`, error.stack);
      throw error;
    }
  }

  async subtractBusinessDays(
    startDate: Date,
    businessDays: number,
    countryCode: string = 'JP',
  ): Promise<Date> {
    try {
      this.logger.debug(`subtractBusinessDays: startDate=${startDate.toISOString()}, businessDays=${businessDays}`);
      
      if (!startDate || isNaN(startDate.getTime())) {
        this.logger.error(`Invalid startDate provided to subtractBusinessDays: ${startDate}`);
        throw new Error(`Invalid startDate: ${startDate}`);
      }
      
      const result = await this.addBusinessDays(startDate, -businessDays, countryCode);
      this.logger.debug(`subtractBusinessDays result: ${result.toISOString()}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in subtractBusinessDays: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getBusinessDaysBetween(
    startDate: Date,
    endDate: Date,
    countryCode: string = 'JP',
  ): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return -await this.getBusinessDaysBetween(end, start, countryCode);
    }
    
    const holidays = await this.holidayRepository.findByCountryAndDateRange(
      countryCode,
      start,
      end,
    );
    
    const holidaySet = new Set(
      holidays.map((h) => this.dateToString(h.getDate())),
    );
    
    let businessDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      if (this.isBusinessDaySync(current, holidaySet)) {
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return businessDays;
  }

  async isBusinessDay(
    date: Date,
    countryCode: string = 'JP',
  ): Promise<boolean> {
    const holidays = await this.holidayRepository.findByCountryAndDateRange(
      countryCode,
      date,
      date,
    );
    const holidaySet = new Set(
      holidays.map((h) => this.dateToString(h.getDate())),
    );
    
    return this.isBusinessDaySync(date, holidaySet);
  }

  private isBusinessDaySync(date: Date, holidaySet: Set<string>): boolean {
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    const dateString = this.dateToString(date);
    if (holidaySet.has(dateString)) {
      return false;
    }
    
    return true;
  }

  async getNextBusinessDay(
    date: Date,
    countryCode: string = 'JP',
  ): Promise<Date> {
    return this.addBusinessDays(date, 1, countryCode);
  }

  async getPreviousBusinessDay(
    date: Date,
    countryCode: string = 'JP',
  ): Promise<Date> {
    return this.addBusinessDays(date, -1, countryCode);
  }

  async adjustToBusinessDay(
    date: Date,
    direction: 'forward' | 'backward' = 'forward',
    countryCode: string = 'JP',
  ): Promise<Date> {
    try {
      this.logger.debug(`adjustToBusinessDay: date=${date?.toISOString()}, direction=${direction}`);
      
      if (!date || isNaN(date.getTime())) {
        this.logger.error(`Invalid date provided to adjustToBusinessDay: ${date}`);
        throw new Error(`Invalid date: ${date}`);
      }
      
      const isBusinessDay = await this.isBusinessDay(date, countryCode);
      
      if (isBusinessDay) {
        return new Date(date);
      }
      
      if (direction === 'forward') {
        return this.getNextBusinessDay(date, countryCode);
      } else {
        return this.getPreviousBusinessDay(date, countryCode);
      }
    } catch (error) {
      this.logger.error(`Error in adjustToBusinessDay: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getBusinessDaysInMonth(
    year: number,
    month: number,
    countryCode: string = 'JP',
  ): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return this.getBusinessDaysBetween(startDate, endDate, countryCode);
  }

  async getBusinessDaysInYear(
    year: number,
    countryCode: string = 'JP',
  ): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    return this.getBusinessDaysBetween(startDate, endDate, countryCode);
  }

  private dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}