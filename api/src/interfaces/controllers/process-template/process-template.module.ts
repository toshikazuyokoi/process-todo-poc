import { Module } from '@nestjs/common';
import { ProcessTemplateController } from './process-template.controller';
import { CreateProcessTemplateUseCase } from '@application/usecases/process-template/create-process-template.usecase';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { ProcessTemplateRepository } from '@infrastructure/repositories/process-template.repository';
import { UsersModule } from '@infrastructure/users/users.module';

@Module({
  imports: [InfrastructureModule, UsersModule],
  controllers: [ProcessTemplateController],
  providers: [
    CreateProcessTemplateUseCase,
    {
      provide: 'IProcessTemplateRepository',
      useClass: ProcessTemplateRepository,
    },
  ],
  exports: [
    CreateProcessTemplateUseCase,
  ],
})
export class ProcessTemplateModule {}