import { BusinessDayService } from './business-day.service';
import { IHolidayRepository } from '../repositories/holiday.repository.interface';
import { Holiday } from '../entities/holiday';

describe('BusinessDayService', () => {
  let service: BusinessDayService;
  let mockHolidayRepository: IHolidayRepository;

  beforeEach(() => {
    mockHolidayRepository = {
      findByCountryAndDateRange: jest.fn(),
      findByCountryAndYear: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      deleteByCountryAndYear: jest.fn(),
    };
    service = new BusinessDayService(mockHolidayRepository);
  });

  describe('addBusinessDays', () => {
    it('should add business days correctly skipping weekends', async () => {
      const startDate = new Date('2024-01-01'); // Monday
      const businessDays = 5;
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue([]);

      const result = await service.addBusinessDays(startDate, businessDays, 'JP');
      
      // Should be Monday, January 8, 2024 (skipping weekend)
      expect(result.getDate()).toBe(8);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should handle negative business days', async () => {
      const startDate = new Date('2024-01-08'); // Monday
      const businessDays = -5;
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue([]);

      const result = await service.addBusinessDays(startDate, businessDays, 'JP');
      
      // Should be Monday, January 1, 2024
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should skip holidays', async () => {
      const startDate = new Date('2024-01-01'); // Monday
      const businessDays = 2;
      
      const holidays = [
        new Holiday('JP', new Date('2024-01-02'), 'Test Holiday'),
      ];
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue(holidays);

      const result = await service.addBusinessDays(startDate, businessDays, 'JP');
      
      // Should be Thursday, January 4, 2024 (skipping holiday on Tuesday)
      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });
  });

  describe('getBusinessDaysBetween', () => {
    it('should count business days between two dates', async () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-08'); // Monday next week
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue([]);

      const result = await service.getBusinessDaysBetween(startDate, endDate, 'JP');
      
      // Should be 6 business days (Mon-Fri + Mon)
      expect(result).toBe(6);
    });

    it('should exclude holidays from count', async () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-05'); // Friday
      
      const holidays = [
        new Holiday('JP', new Date('2024-01-03'), 'Test Holiday'),
      ];
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue(holidays);

      const result = await service.getBusinessDaysBetween(startDate, endDate, 'JP');
      
      // Should be 4 business days (Mon, Tue, Thu, Fri - excluding Wed holiday)
      expect(result).toBe(4);
    });
  });

  describe('adjustToBusinessDay', () => {
    it('should adjust weekend to next business day when moving forward', async () => {
      const date = new Date('2024-01-06'); // Saturday
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue([]);

      const result = await service.adjustToBusinessDay(date, 'forward', 'JP');
      
      // Should be Monday, January 8, 2024
      expect(result.getDate()).toBe(8);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should adjust weekend to previous business day when moving backward', async () => {
      const date = new Date('2024-01-06'); // Saturday
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue([]);

      const result = await service.adjustToBusinessDay(date, 'backward', 'JP');
      
      // Should be Friday, January 5, 2024
      expect(result.getDate()).toBe(5);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should not adjust if already a business day', async () => {
      const date = new Date('2024-01-03'); // Wednesday
      
      jest.spyOn(mockHolidayRepository, 'findByCountryAndDateRange').mockResolvedValue([]);

      const result = await service.adjustToBusinessDay(date, 'forward', 'JP');
      
      // Should remain Wednesday, January 3, 2024
      expect(result.getDate()).toBe(3);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
    });
  });
});