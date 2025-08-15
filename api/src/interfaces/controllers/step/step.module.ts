import { Module } from '@nestjs/common';
import { StepController } from './step.controller';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { GetStepByIdUseCase } from '@application/usecases/step/get-step-by-id.usecase';
import { UpdateStepStatusUseCase } from '@application/usecases/step/update-step-status.usecase';
import { AssignStepToUserUseCase } from '@application/usecases/step/assign-step-to-user.usecase';
import { LockStepUseCase } from '@application/usecases/step/lock-step.usecase';
import { UnlockStepUseCase } from '@application/usecases/step/unlock-step.usecase';
import { BulkUpdateStepsUseCase } from '@application/usecases/step/bulk-update-steps.usecase';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    InfrastructureModule,
    EventEmitterModule,
  ],
  controllers: [StepController],
  providers: [
    GetStepByIdUseCase,
    UpdateStepStatusUseCase,
    AssignStepToUserUseCase,
    LockStepUseCase,
    UnlockStepUseCase,
    BulkUpdateStepsUseCase,
  ],
  exports: [
    GetStepByIdUseCase,
    UpdateStepStatusUseCase,
    AssignStepToUserUseCase,
  ],
})
export class StepModule {}