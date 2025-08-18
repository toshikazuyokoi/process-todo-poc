import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [KanbanController],
})
export class KanbanModule {}