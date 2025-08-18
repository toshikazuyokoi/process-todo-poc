import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [CalendarController],
})
export class CalendarModule {}