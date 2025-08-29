import { Module } from '@nestjs/common';
import { AIConversationService } from './ai-agent/services/ai-conversation.service';
import { ProcessAnalysisService } from './ai-agent/services/process-analysis.service';
import { TemplateRecommendationService } from './ai-agent/services/template-recommendation.service';
import { WebResearchService } from './ai-agent/services/web-research.service';
import { KnowledgeBaseService } from './ai-agent/services/knowledge-base.service';
import { InformationValidationService } from './ai-agent/services/information-validation.service';
import { KnowledgeBaseManagerService } from './services/knowledge-base-manager.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  providers: [
    AIConversationService,
    ProcessAnalysisService,
    TemplateRecommendationService,
    WebResearchService,
    KnowledgeBaseService,
    InformationValidationService,
    KnowledgeBaseManagerService,
  ],
  exports: [
    AIConversationService,
    ProcessAnalysisService,
    TemplateRecommendationService,
    WebResearchService,
    KnowledgeBaseService,
    InformationValidationService,
    KnowledgeBaseManagerService,
  ],
})
export class DomainModule {}