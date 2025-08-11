import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Holiday } from '@domain/entities/holiday';
import { IHolidayRepository } from '@domain/repositories/holiday.repository.interface';

@Injectable()
export class HolidayRepository implements IHolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCountryAndDateRange(
    countryCode: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Holiday[]> {
    const data = await this.prisma.holiday.findMany({
      where: {
        countryCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByCountryAndYear(countryCode: string, year: number): Promise<Holiday[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const data = await this.prisma.holiday.findMany({
      where: {
        countryCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async save(holiday: Holiday): Promise<Holiday> {
    const data = await this.prisma.holiday.create({
      data: {
        countryCode: holiday.getCountryCode(),
        date: holiday.getDate(),
        name: holiday.getName(),
      },
    });

    return this.toDomain(data);
  }

  async saveMany(holidays: Holiday[]): Promise<Holiday[]> {
    const data = await this.prisma.$transaction(
      holidays.map((holiday) =>
        this.prisma.holiday.create({
          data: {
            countryCode: holiday.getCountryCode(),
            date: holiday.getDate(),
            name: holiday.getName(),
          },
        }),
      ),
    );

    return data.map((d) => this.toDomain(d));
  }

  async delete(countryCode: string, date: Date): Promise<void> {
    await this.prisma.holiday.delete({
      where: {
        countryCode_date: {
          countryCode,
          date,
        },
      },
    });
  }

  async deleteByCountryAndYear(countryCode: string, year: number): Promise<void> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    await this.prisma.holiday.deleteMany({
      where: {
        countryCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  private toDomain(data: any): Holiday {
    return new Holiday(data.countryCode, data.date, data.name);
  }
}