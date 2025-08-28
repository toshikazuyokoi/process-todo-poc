import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../../../infrastructure/ai/openai.service';
import { ComplexityLevel, ProcessCategory } from '../entities/process-analysis.entity';
// import { ConversationMessage } from '../types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}
import { AIContext } from '../../../infrastructure/ai/ai-client.interface';

// Domain types as per design document
export interface ProcessRequirement {
  id: string;
  category: 'functional' | 'non-functional' | 'technical' | 'business';
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  source: string;
  extractedAt: Date;
}


export interface ProcessAnalysis {
  requirements: ProcessRequirement[];
  stakeholders: Stakeholder[];
  deliverables: Deliverable[];
  constraints: Constraint[];
  complexity: ComplexityLevel;
  category: ProcessCategory;
  confidence?: number;
  summary: string;
}

export interface Stakeholder {
  id: string;
  role: string;
  responsibilities: string[];
  touchpoints: string[];
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  format: string;
  owner: string;
  deadline?: string;
}

export interface Constraint {
  id: string;
  type: 'time' | 'budget' | 'resource' | 'technical' | 'regulatory';
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
}


interface Entity {
  type: string;
  value: string;
  confidence: number;
}

interface Intent {
  category: string;
  action: string;
  confidence: number;
}

/**
 * Process Analysis Service
 * As per ai_agent_class_diagram.md specification
 */
@Injectable()
export class ProcessAnalysisService {
  private readonly logger = new Logger(ProcessAnalysisService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    // Note: NaturalLanguageProcessingService is not yet implemented
    // Using OpenAIService directly for NLP tasks
  ) {}

  /**
   * Extract requirements from conversation
   * Design: ProcessAnalysisService.extractRequirements()
   */
  async extractRequirements(conversation: ConversationMessage[]): Promise<ProcessRequirement[]> {
    this.logger.log('Extracting requirements from conversation');

    const context: AIContext = {
      userId: 0, // System context
      sessionId: 'analysis',
      previousMessages: conversation,
      metadata: {
        task: 'requirement_extraction',
      },
    };

    const prompt = this.buildRequirementExtractionPrompt(conversation);
    
    // Using OpenAIService.generateResponse as it exists
    const response = await this.openAIService.generateResponse(prompt, context);
    
    const requirements = this.parseRequirementsFromResponse(response.content);
    
    return requirements.map((req, index) => ({
      id: `req-${Date.now()}-${index}`,
      category: req.category || 'functional',
      description: req.description,
      priority: req.priority || 'medium',
      confidence: req.confidence || response.confidence || 0.7,
      source: req.source || 'conversation',
      extractedAt: new Date(),
    }));
  }

  /**
   * Analyze requirements
   * Design: ProcessAnalysisService.analyzeRequirements()
   */
  async analyzeRequirements(requirements: ProcessRequirement[]): Promise<ProcessAnalysis> {
    this.logger.log(`Analyzing ${requirements.length} requirements`);

    // Parallel analysis as per design
    const [stakeholders, deliverables, constraints, complexity, category] = await Promise.all([
      this.identifyStakeholders(requirements),
      this.identifyDeliverables(requirements),
      this.identifyConstraints(requirements),
      this.estimateComplexity(requirements),
      this.categorizeProcess(requirements),
    ]);

    const analysis: ProcessAnalysis = {
      requirements,
      stakeholders,
      deliverables,
      constraints,
      complexity,
      category,
      confidence: this.calculateConfidence({ requirements, stakeholders, deliverables, constraints }),
      summary: this.generateAnalysisSummary(requirements, stakeholders, deliverables),
    };

    if (!this.validateAnalysis(analysis)) {
      this.logger.warn('Analysis validation failed, returning with low confidence');
      analysis.confidence = Math.min(analysis.confidence || 0, 0.5);
    }

    return analysis;
  }

  /**
   * Identify stakeholders
   * Design: ProcessAnalysisService.identifyStakeholders()
   */
  async identifyStakeholders(requirements: ProcessRequirement[]): Promise<Stakeholder[]> {
    const context: AIContext = {
      userId: 0,
      sessionId: 'analysis',
      metadata: {
        task: 'stakeholder_identification',
      },
    };

    const prompt = this.buildStakeholderPrompt(requirements);
    const response = await this.openAIService.generateResponse(prompt, context);

    return this.parseStakeholdersFromResponse(response.content);
  }

  /**
   * Identify deliverables
   * Design: ProcessAnalysisService.identifyDeliverables()
   */
  async identifyDeliverables(requirements: ProcessRequirement[]): Promise<Deliverable[]> {
    const context: AIContext = {
      userId: 0,
      sessionId: 'analysis',
      metadata: {
        task: 'deliverable_identification',
      },
    };

    const prompt = this.buildDeliverablesPrompt(requirements);
    const response = await this.openAIService.generateResponse(prompt, context);

    return this.parseDeliverablesFromResponse(response.content);
  }

  /**
   * Identify constraints
   * Design: ProcessAnalysisService.identifyConstraints()
   */
  async identifyConstraints(requirements: ProcessRequirement[]): Promise<Constraint[]> {
    const context: AIContext = {
      userId: 0,
      sessionId: 'analysis',
      metadata: {
        task: 'constraint_identification',
      },
    };

    const prompt = this.buildConstraintsPrompt(requirements);
    const response = await this.openAIService.generateResponse(prompt, context);

    return this.parseConstraintsFromResponse(response.content);
  }

  /**
   * Estimate complexity
   * Design: ProcessAnalysisService.estimateComplexity()
   */
  async estimateComplexity(requirements: ProcessRequirement[]): Promise<ComplexityLevel> {
    const factors = {
      requirementCount: requirements.length,
      highPriorityCount: requirements.filter(r => r.priority === 'high').length,
      averageConfidence: requirements.reduce((sum, r) => sum + r.confidence, 0) / requirements.length || 0,
    };

    if (factors.requirementCount <= 5 && factors.highPriorityCount <= 1) {
      return ComplexityLevel.SIMPLE;
    } else if (factors.requirementCount <= 10 && factors.highPriorityCount <= 3) {
      return ComplexityLevel.MEDIUM;
    } else if (factors.requirementCount <= 20 && factors.highPriorityCount <= 5) {
      return ComplexityLevel.COMPLEX;
    } else {
      return ComplexityLevel.VERY_COMPLEX;
    }
  }

  /**
   * Categorize process
   * Design: ProcessAnalysisService.categorizeProcess()
   */
  async categorizeProcess(requirements: ProcessRequirement[]): Promise<ProcessCategory> {
    const categoryKeywords: Partial<Record<ProcessCategory, string[]>> = {
      [ProcessCategory.DEVELOPMENT]: ['software', 'development', 'code', 'programming', 'application', 'implement'],
      [ProcessCategory.OPERATIONS]: ['operations', 'operational', 'daily', 'routine', 'execution', 'process'],
      [ProcessCategory.MARKETING]: ['marketing', 'campaign', 'promotion', 'brand', 'advertising'],
      [ProcessCategory.SALES]: ['sales', 'revenue', 'customer', 'deal', 'contract'],
      [ProcessCategory.HR]: ['hr', 'human', 'resource', 'employee', 'recruitment', 'training'],
      [ProcessCategory.FINANCE]: ['finance', 'budget', 'accounting', 'financial', 'cost'],
      [ProcessCategory.MANUFACTURING]: ['manufacturing', 'production', 'assembly', 'factory', 'product'],
      [ProcessCategory.QUALITY_ASSURANCE]: ['quality', 'testing', 'qa', 'assurance', 'validation'],
      [ProcessCategory.CUSTOMER_SERVICE]: ['support', 'service', 'customer', 'help', 'assistance'],
      [ProcessCategory.RESEARCH]: ['research', 'analysis', 'study', 'investigation', 'discovery'],
    };

    const scores: Partial<Record<ProcessCategory, number>> = {};
    // Initialize scores for categories we're checking
    for (const category of Object.keys(categoryKeywords)) {
      scores[category as ProcessCategory] = 0;
    }

    for (const req of requirements) {
      const text = req.description.toLowerCase();
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            const categoryScore = scores[category as ProcessCategory];
            if (categoryScore !== undefined) {
              scores[category as ProcessCategory] = categoryScore + 1;
            }
          }
        }
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    const category = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as ProcessCategory;
    
    return category || ProcessCategory.OPERATIONS;
  }

  /**
   * Private helper methods
   */
  private async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // Role patterns
    const rolePattern = /(?:role|stakeholder|owner|responsible):\s*([^,.\n]+)/gi;
    let match;
    while ((match = rolePattern.exec(text)) !== null) {
      entities.push({
        type: 'stakeholder',
        value: match[1].trim(),
        confidence: 0.8,
      });
    }

    // Deliverable patterns
    const deliverablePattern = /(?:deliverable|output|artifact|document):\s*([^,.\n]+)/gi;
    while ((match = deliverablePattern.exec(text)) !== null) {
      entities.push({
        type: 'deliverable',
        value: match[1].trim(),
        confidence: 0.8,
      });
    }

    return entities;
  }

  private async classifyIntent(message: string): Promise<Intent> {
    const intents = [
      { category: 'requirement', keywords: ['need', 'require', 'must', 'should'] },
      { category: 'constraint', keywords: ['limit', 'cannot', 'restrict', 'maximum'] },
      { category: 'goal', keywords: ['achieve', 'objective', 'target', 'aim'] },
    ];

    for (const intent of intents) {
      for (const keyword of intent.keywords) {
        if (message.toLowerCase().includes(keyword)) {
          return {
            category: intent.category,
            action: 'define',
            confidence: 0.75,
          };
        }
      }
    }

    return {
      category: 'general',
      action: 'inform',
      confidence: 0.5,
    };
  }

  private calculateConfidence(analysis: Partial<ProcessAnalysis>): number {
    const factors = [
      analysis.requirements ? Math.min(analysis.requirements.length / 10, 1) : 0,
      analysis.stakeholders ? Math.min(analysis.stakeholders.length / 5, 1) : 0,
      analysis.deliverables ? Math.min(analysis.deliverables.length / 5, 1) : 0,
      analysis.constraints ? Math.min(analysis.constraints.length / 3, 1) : 0,
    ];

    const averageConfidence = factors.reduce((sum, f) => sum + f, 0) / factors.length;
    return Math.min(Math.max(averageConfidence, 0.3), 0.95);
  }

  private validateAnalysis(analysis: ProcessAnalysis): boolean {
    return (
      analysis.requirements.length > 0 &&
      analysis.stakeholders.length > 0 &&
      (analysis.confidence || 0) > 0.3
    );
  }

  /**
   * Prompt building methods
   */
  private buildRequirementExtractionPrompt(conversation: ConversationMessage[]): string {
    const conversationText = conversation
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Extract process requirements from the following conversation.
For each requirement, identify:
- Category (functional, non-functional, technical, business)
- Description
- Priority (high, medium, low)
- Confidence score (0-1)
- Source quote from conversation

Conversation:
${conversationText}

Return as JSON array with structure:
[{
  "category": "functional|non-functional|technical|business",
  "description": "requirement description",
  "priority": "high|medium|low",
  "confidence": 0.8,
  "source": "quote from conversation"
}]`;
  }

  private buildStakeholderPrompt(requirements: ProcessRequirement[]): string {
    const reqText = requirements.map(r => r.description).join('\n');
    
    return `Identify stakeholders from these process requirements:
${reqText}

For each stakeholder, provide:
- Role name
- Key responsibilities (array)
- Process touchpoints (array)

Return as JSON array:
[{
  "role": "stakeholder role",
  "responsibilities": ["resp1", "resp2"],
  "touchpoints": ["touchpoint1", "touchpoint2"]
}]`;
  }

  private buildDeliverablesPrompt(requirements: ProcessRequirement[]): string {
    const reqText = requirements.map(r => r.description).join('\n');
    
    return `Identify deliverables from these process requirements:
${reqText}

For each deliverable, provide:
- Name
- Description
- Format (document, report, system, etc.)
- Owner/responsible party
- Optional deadline

Return as JSON array:
[{
  "name": "deliverable name",
  "description": "description",
  "format": "document|report|system|etc",
  "owner": "responsible party",
  "deadline": "optional deadline"
}]`;
  }

  private buildConstraintsPrompt(requirements: ProcessRequirement[]): string {
    const reqText = requirements.map(r => r.description).join('\n');
    
    return `Identify constraints from these process requirements:
${reqText}

For each constraint, provide:
- Type (time, budget, resource, technical, regulatory)
- Description
- Impact level (low, medium, high)
- Possible mitigation

Return as JSON array:
[{
  "type": "time|budget|resource|technical|regulatory",
  "description": "constraint description",
  "impact": "low|medium|high",
  "mitigation": "optional mitigation strategy"
}]`;
  }

  /**
   * Response parsing methods
   */
  private parseRequirementsFromResponse(response: string): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error('Failed to parse requirements response', error);
    }
    return [];
  }

  private parseStakeholdersFromResponse(response: string): Stakeholder[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data.map((item: any, index: number) => ({
          id: `stakeholder-${index}`,
          role: item.role || 'Unknown',
          responsibilities: item.responsibilities || [],
          touchpoints: item.touchpoints || [],
        }));
      }
    } catch (error) {
      this.logger.error('Failed to parse stakeholders response', error);
    }
    return [];
  }

  private parseDeliverablesFromResponse(response: string): Deliverable[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data.map((item: any, index: number) => ({
          id: `deliverable-${index}`,
          name: item.name || 'Unknown',
          description: item.description || '',
          format: item.format || 'document',
          owner: item.owner || 'TBD',
          deadline: item.deadline,
        }));
      }
    } catch (error) {
      this.logger.error('Failed to parse deliverables response', error);
    }
    return [];
  }

  private parseConstraintsFromResponse(response: string): Constraint[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data.map((item: any, index: number) => ({
          id: `constraint-${index}`,
          type: item.type || 'technical',
          description: item.description || '',
          impact: item.impact || 'medium',
          mitigation: item.mitigation,
        }));
      }
    } catch (error) {
      this.logger.error('Failed to parse constraints response', error);
    }
    return [];
  }

  private generateAnalysisSummary(
    requirements: ProcessRequirement[],
    stakeholders: Stakeholder[],
    deliverables: Deliverable[],
  ): string {
    return `Process analysis complete. Identified ${requirements.length} requirements, ${stakeholders.length} stakeholders, and ${deliverables.length} deliverables.`;
  }

  /**
   * Calculate conversation progress
   * Used by ProcessUserMessageUseCase
   */
  async calculateConversationProgress(
    conversation: ConversationMessage[],
    requirements: ProcessRequirement[],
  ): Promise<{
    completeness: number;
    missingAreas?: string[];
  }> {
    // Simple progress calculation based on conversation length and requirements
    const minMessages = 5;
    const typicalMessages = 15;
    const maxMessages = 30;
    
    const messageCount = conversation.length;
    const requirementCount = requirements.length;
    
    // Calculate progress based on multiple factors
    let progress = 0;
    
    // Message count factor (30%)
    if (messageCount >= maxMessages) {
      progress += 30;
    } else if (messageCount >= typicalMessages) {
      progress += 20 + (10 * (messageCount - typicalMessages) / (maxMessages - typicalMessages));
    } else if (messageCount >= minMessages) {
      progress += 10 + (10 * (messageCount - minMessages) / (typicalMessages - minMessages));
    } else {
      progress += 10 * (messageCount / minMessages);
    }
    
    // Requirements extracted factor (70%)
    const targetRequirements = 10; // Typical number of requirements
    if (requirementCount >= targetRequirements) {
      progress += 70;
    } else {
      progress += 70 * (requirementCount / targetRequirements);
    }
    
    // Calculate estimated messages remaining
    let estimatedRemaining = 0;
    if (progress < 100) {
      const progressRate = progress / messageCount;
      if (progressRate > 0) {
        estimatedRemaining = Math.ceil((100 - progress) / progressRate);
      } else {
        estimatedRemaining = typicalMessages - messageCount;
      }
    }
    
    // Determine missing areas
    const missingAreas: string[] = [];
    if (requirementCount < 3) {
      missingAreas.push('functional requirements');
    }
    if (!requirements.some(r => r.category === 'non-functional')) {
      missingAreas.push('non-functional requirements');
    }
    if (!requirements.some(r => r.category === 'technical')) {
      missingAreas.push('technical constraints');
    }
    
    return {
      completeness: Math.min(100, Math.round(progress)) / 100, // Return as decimal 0-1
      missingAreas: missingAreas.length > 0 ? missingAreas : undefined,
    };
  }
}