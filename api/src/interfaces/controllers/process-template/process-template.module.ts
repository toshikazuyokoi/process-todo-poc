import { Module } from '@nestjs/common';
import { ProcessTemplateController } from './process-template.controller';
import { CreateProcessTemplateUseCase } from '@application/usecases/process-template/create-process-template.usecase';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { ProcessTemplateRepository } from '@infrastructure/repositories/process-template.repository';

@Module({
  imports: [InfrastructureModule],
  controllers: [ProcessTemplateController],
  providers: [
    CreateProcessTemplateUseCase,
    {
      provide: 'IProcessTemplateRepository',
      useClass: ProcessTemplateRepository,
    },
  ],
})
export class ProcessTemplateModule {}