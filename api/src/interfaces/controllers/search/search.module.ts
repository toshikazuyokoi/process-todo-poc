import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchCasesUseCase } from '@application/usecases/search/search-cases.usecase';
import { SearchStepsUseCase } from '@application/usecases/search/search-steps.usecase';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [SearchController],
  providers: [
    SearchCasesUseCase,
    SearchStepsUseCase,
  ],
  exports: [
    SearchCasesUseCase,
    SearchStepsUseCase,
  ],
})
export class SearchModule {}