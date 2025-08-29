import { Module } from '@nestjs/common';
import { DomainModule } from '../../../domain/domain.module';

// Industry Template Use Cases
import { GetIndustryTemplatesUseCase } from './get-industry-templates.usecase';
import { CreateIndustryTemplateUseCase } from './create-industry-template.usecase';
import { UpdateIndustryTemplateUseCase } from './update-industry-template.usecase';
import { DeleteIndustryTemplateUseCase } from './delete-industry-template.usecase';

// Process Type Use Cases
import { GetProcessTypesUseCase } from './get-process-types.usecase';
import { CreateProcessTypeUseCase } from './create-process-type.usecase';
import { UpdateProcessTypeUseCase } from './update-process-type.usecase';
import { DeleteProcessTypeUseCase } from './delete-process-type.usecase';

// Best Practice Use Cases
import { GetBestPracticesUseCase } from './get-best-practices.usecase';
import { CreateBestPracticeUseCase } from './create-best-practice.usecase';
import { UpdateBestPracticeUseCase } from './update-best-practice.usecase';
import { BulkUpdateBestPracticesUseCase } from './bulk-update-best-practices.usecase';

/**
 * Knowledge Base Module
 * Provides use cases for managing knowledge base entities
 */
@Module({
  imports: [DomainModule],
  providers: [
    // Industry Template Use Cases
    GetIndustryTemplatesUseCase,
    CreateIndustryTemplateUseCase,
    UpdateIndustryTemplateUseCase,
    DeleteIndustryTemplateUseCase,

    // Process Type Use Cases
    GetProcessTypesUseCase,
    CreateProcessTypeUseCase,
    UpdateProcessTypeUseCase,
    DeleteProcessTypeUseCase,

    // Best Practice Use Cases
    GetBestPracticesUseCase,
    CreateBestPracticeUseCase,
    UpdateBestPracticeUseCase,
    BulkUpdateBestPracticesUseCase,
  ],
  exports: [
    // Industry Template Use Cases
    GetIndustryTemplatesUseCase,
    CreateIndustryTemplateUseCase,
    UpdateIndustryTemplateUseCase,
    DeleteIndustryTemplateUseCase,

    // Process Type Use Cases
    GetProcessTypesUseCase,
    CreateProcessTypeUseCase,
    UpdateProcessTypeUseCase,
    DeleteProcessTypeUseCase,

    // Best Practice Use Cases
    GetBestPracticesUseCase,
    CreateBestPracticeUseCase,
    UpdateBestPracticeUseCase,
    BulkUpdateBestPracticesUseCase,
  ],
})
export class KnowledgeBaseModule {}