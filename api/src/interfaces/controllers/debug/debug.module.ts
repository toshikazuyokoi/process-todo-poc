import { Module } from '@nestjs/common';
import { DebugController } from '../debug.controller';
import { ReplanDomainService } from '@domain/services/replan-domain.service';
import { BusinessDayService } from '@domain/services/business-day.service';
import { ProcessTemplateRepository } from '@infrastructure/repositories/process-template.repository';
import { HolidayRepository } from '@infrastructure/repositories/holiday.repository';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DebugController],
  providers: [
    ReplanDomainService,
    BusinessDayService,
    ProcessTemplateRepository,
    HolidayRepository,
    {
      provide: 'IProcessTemplateRepository',
      useClass: ProcessTemplateRepository,
    },
    {
      provide: 'IHolidayRepository',
      useClass: HolidayRepository,
    },
  ],
})
export class DebugModule {}