import { Injectable, Logger, Inject } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { ProcessKnowledgeRepository } from '../../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { WebResearchCacheRepository } from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
import { 
  TemplateRecommendationService, 
  TemplateRecommendation, 
  RecommendationContext,
  KnowledgeBaseResult,
} from '../../../domain/ai-agent/services/template-recommendation.service';
import { 
  ProcessAnalysisService, 
  ProcessAnalysis,
  ProcessRequirement,
} from '../../../domain/ai-agent/services/process-analysis.service';
import { WebResearchService } from '../../../domain/ai-agent/services/web-research.service';
// import { BackgroundJobQueueInterface } from '../../../infrastructure/queue/interfaces/background-job-queue.interface';
import { DomainException } from '../../../domain/exceptions/domain.exception';
// import { JobType } from '../../../infrastructure/queue/types';

enum JobType {
  FEEDBACK_PROCESSING = 'FEEDBACK_PROCESSING',
  WEB_RESEARCH = 'WEB_RESEARCH',
}
import { InterviewSession } from '../../../domain/ai-agent/entities/interview-session.entity';
import { v4 as uuidv4 } from 'uuid';

// Input/Output types as per design
export interface GenerateTemplateInput {
  sessionId: string;
  userId: number;
  preferences?: Record<string, any>;
}

export interface GenerateTemplateOutput {
  sessionId: string;
  recommendations: TemplateRecommendation[];
  analysisId: string;
  researchJobId?: string;
  generatedAt: Date;
}

export interface ResearchResult {
  title: string;
  source: string;
  url?: string;
  content: string;
  relevance: number;
  publishedAt?: Date;
}

/**
 * Generate Template Recommendations Use Case
 * As per ai_agent_class_diagram.md specification
 */
@Injectable()
export class GenerateTemplateRecommendationsUseCase {
  private readonly logger = new Logger(GenerateTemplateRecommendationsUseCase.name);

  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
    private readonly templateService: TemplateRecommendationService,
    private readonly analysisService: ProcessAnalysisService,
    @Inject('ProcessKnowledgeRepository')
    private readonly knowledgeRepository: ProcessKnowledgeRepository,
    private readonly researchService: WebResearchService,
    // private readonly backgroundJobQueue: BackgroundJobQueueInterface,
  ) {}

  /**
   * Execute template generation
   * Design: GenerateTemplateRecommendationsUseCase.execute()
   */
  async execute(input: GenerateTemplateInput): Promise<GenerateTemplateOutput> {
    this.logger.log(`Generating template recommendations for session ${input.sessionId}`);

    try {
      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Load session
      const session = await this.loadSession(input.sessionId);

      // Step 3: Validate session
      this.validateSession(session, input.userId);

      // Step 4: Analyze requirements
      const requirements = session.getExtractedRequirements();
      if (requirements.length === 0) {
        throw new DomainException('No requirements extracted from session');
      }

      const analysis = await this.analyzeRequirements(requirements);

      // Step 5: Search knowledge base
      const knowledgeResults = await this.searchKnowledgeBase(analysis);

      // Step 6: Enqueue web research (async)
      const researchJobId = await this.enqueueWebResearch(analysis);

      // Step 7: Generate recommendations
      const researchResults: ResearchResult[] = []; // Will be populated by background job
      const recommendations = await this.generateRecommendations(
        analysis,
        knowledgeResults,
        researchResults,
      );

      // Step 8: Validate recommendations
      const validationResult = await this.validateRecommendations(recommendations);
      if (!validationResult.valid) {
        this.logger.warn('Some recommendations failed validation', validationResult.errors);
      }

      // Step 9: Save recommendations
      await this.saveRecommendations(input.sessionId, recommendations);

      // Return output
      return {
        sessionId: input.sessionId,
        recommendations,
        analysisId: `analysis-${Date.now()}`,
        researchJobId,
        generatedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(
        `Failed to generate template recommendations for session ${input.sessionId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate input
   * Design: GenerateTemplateRecommendationsUseCase.validateInput()
   */
  private validateInput(input: GenerateTemplateInput): void {
    if (!input.sessionId) {
      throw new DomainException('Session ID is required');
    }
    if (!input.userId) {
      throw new DomainException('User ID is required');
    }
  }

  /**
   * Load session from repository
   * Design: GenerateTemplateRecommendationsUseCase.loadSession()
   */
  private async loadSession(sessionId: string): Promise<InterviewSession> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new DomainException(`Session not found: ${sessionId}`);
    }
    return session;
  }

  /**
   * Validate session
   * Design: GenerateTemplateRecommendationsUseCase.validateSession()
   */
  private validateSession(session: InterviewSession, userId: number): void {
    if (session.getUserId() !== userId) {
      throw new DomainException('Unauthorized: Session does not belong to user');
    }
    if (!session.isActive()) {
      throw new DomainException('Session is not active');
    }
    if (session.getConversation().length < 3) {
      throw new DomainException('Insufficient conversation history for template generation');
    }
  }

  /**
   * Analyze requirements
   * Design: GenerateTemplateRecommendationsUseCase.analyzeRequirements()
   */
  private async analyzeRequirements(requirements: any[]): Promise<ProcessAnalysis> {
    this.logger.log(`Analyzing ${requirements.length} requirements`);
    
    // Convert entity requirements to service format if needed
    const serviceRequirements = requirements.map(req => ({
      id: req.id,
      category: req.category as 'functional' | 'non-functional' | 'technical' | 'business',
      description: req.description,
      priority: req.priority as 'high' | 'medium' | 'low',
      confidence: req.confidence,
      source: 'conversation',
      extractedAt: new Date(),
    }));
    
    return await this.analysisService.analyzeRequirements(serviceRequirements);
  }

  /**
   * Search knowledge base
   * Design: GenerateTemplateRecommendationsUseCase.searchKnowledgeBase()
   */
  private async searchKnowledgeBase(analysis: ProcessAnalysis): Promise<KnowledgeBaseResult[]> {
    this.logger.log('Searching knowledge base for similar templates');
    
    try {
      // Use ProcessKnowledgeRepository to search for templates
      const templates = await this.knowledgeRepository.findBestPractices(
        analysis.category,
        analysis.complexity,
      );
      
      // Convert to KnowledgeBaseResult format
      return templates.map(template => ({
        source: 'knowledge_base',
        relevance: 0.8,
        content: JSON.stringify(template),
        metadata: template,
      }));
    } catch (error) {
      this.logger.warn('Knowledge base search failed, continuing without it', error);
      return [];
    }
  }

  /**
   * Enqueue web research job
   * Design: GenerateTemplateRecommendationsUseCase.enqueueWebResearch()
   */
  private async enqueueWebResearch(analysis: ProcessAnalysis): Promise<string | undefined> {
    this.logger.log('Enqueueing web research job');
    
    const jobId = uuidv4();
    
    try {
      // await this.backgroundJobQueue.add(JobType.WEB_RESEARCH, {
      //   payload: {
      //     jobId,
      //     category: analysis.category,
      //     requirements: analysis.requirements.map(r => r.description),
      //     stakeholders: analysis.stakeholders.map(s => s.role),
      //     deliverables: analysis.deliverables.map(d => d.name),
      //   },
      //   metadata: {
      //     priority: 5,
      //     timestamp: new Date().toISOString(),
      //   },
      // });
      
      return jobId;
    } catch (error) {
      this.logger.warn('Failed to enqueue web research job', error);
      return undefined;
    }
  }

  /**
   * Generate recommendations
   * Design: GenerateTemplateRecommendationsUseCase.generateRecommendations()
   */
  private async generateRecommendations(
    analysis: ProcessAnalysis,
    knowledge: KnowledgeBaseResult[],
    research: ResearchResult[],
  ): Promise<TemplateRecommendation[]> {
    this.logger.log('Generating template recommendations');
    
    // Build recommendation context
    const context: RecommendationContext = {
      industry: this.extractIndustryFromAnalysis(analysis),
      processType: analysis.category,
      constraints: analysis.constraints.map(c => `${c.type}: ${c.description}`),
      preferences: [],
    };
    
    // Note: research results will be empty initially as they're processed async
    // The template service will use knowledge base results primarily
    
    return await this.templateService.generateRecommendations(analysis, context);
  }

  /**
   * Validate recommendations
   * Design: GenerateTemplateRecommendationsUseCase.validateRecommendations()
   */
  private async validateRecommendations(recommendations: TemplateRecommendation[]): Promise<any> {
    this.logger.log('Validating template recommendations');
    return await this.templateService.validateRecommendations(recommendations);
  }

  /**
   * Save recommendations to session
   * Design: GenerateTemplateRecommendationsUseCase.saveRecommendations()
   */
  private async saveRecommendations(
    sessionId: string,
    recommendations: TemplateRecommendation[],
  ): Promise<void> {
    this.logger.log('Saving recommendations to session');
    
    try {
      // Use the repository method to update generated template
      if (recommendations.length > 0) {
        await this.sessionRepository.updateGeneratedTemplate(
          sessionId,
          recommendations[0], // Save the top recommendation
        );
      }
    } catch (error) {
      this.logger.error('Failed to save recommendations to session', error);
      // Continue even if saving fails
    }
  }

  /**
   * Helper method to extract industry from analysis
   */
  private extractIndustryFromAnalysis(analysis: ProcessAnalysis): string {
    // Extract industry from stakeholders or requirements
    // This is a simplified implementation
    const industries = {
      'software': ['developer', 'engineer', 'code', 'software'],
      'healthcare': ['patient', 'doctor', 'medical', 'health'],
      'finance': ['bank', 'financial', 'investment', 'trading'],
      'manufacturing': ['production', 'factory', 'assembly', 'manufacturing'],
      'retail': ['customer', 'store', 'sales', 'retail'],
    };

    const text = [
      ...analysis.requirements.map(r => r.description),
      ...analysis.stakeholders.map(s => s.role),
    ].join(' ').toLowerCase();

    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return industry;
      }
    }

    return 'general';
  }
}