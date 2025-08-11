import { Module } from '@nestjs/common';
import { CaseController } from './case.controller';
import { CreateCaseUseCase } from '@application/usecases/case/create-case.usecase';
import { PreviewReplanUseCase } from '@application/usecases/replan/preview-replan.usecase';
import { ApplyReplanUseCase } from '@application/usecases/replan/apply-replan.usecase';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [CaseController],
  providers: [CreateCaseUseCase, PreviewReplanUseCase, ApplyReplanUseCase],
})
export class CaseModule {}