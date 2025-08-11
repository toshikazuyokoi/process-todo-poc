import { Module } from '@nestjs/common';
import { StepController } from './step.controller';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [StepController],
})
export class StepModule {}