import { Module } from '@nestjs/common';
import { GanttController } from './gantt.controller';
import { GetGanttDataUseCase } from '@application/usecases/gantt/get-gantt-data.usecase';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [GanttController],
  providers: [
    GetGanttDataUseCase,
  ],
  exports: [
    GetGanttDataUseCase,
  ],
})
export class GanttModule {}