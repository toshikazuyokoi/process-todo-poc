import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../../../infrastructure/ai/openai.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { ProcessAnalysis } from './process-analysis.service';
import { TemplateContext } from '../../../infrastructure/ai/ai-client.interface';
import { ComplexityLevel } from '../entities/process-analysis.entity';

// Domain types as per design document
export interface TemplateRecommendation {
  id: string;
  name: string;
  description: string;
  steps: StepRecommendation[];
  confidence: number;
  rationale: string[];
  estimatedDuration: number;
  complexity: ComplexityLevel;
  alternatives?: TemplateRecommendation[];
}

export interface StepRecommendation {
  id: string;
  name: string;
  description: string;
  duration: number;
  dependencies: string[];
  artifacts: string[];
  responsible: string;
  criticalPath: boolean;
}

export interface RecommendationContext {
  industry: string;
  processType: string;
  constraints?: string[];
  preferences?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface KnowledgeBaseResult {
  source: string;
  relevance: number;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Template Recommendation Service
 * As per ai_agent_class_diagram.md specification
 * Note: TemplateValidationService is not yet implemented, using internal validation
 */
@Injectable()
export class TemplateRecommendationService {
  private readonly logger = new Logger(TemplateRecommendationService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly knowledgeService: KnowledgeBaseService,
    // Note: TemplateValidationService is not yet implemented
  ) {}

  /**
   * Generate template recommendations
   * Design: TemplateRecommendationService.generateRecommendations()
   */
  async generateRecommendations(
    analysis: ProcessAnalysis,
    context: RecommendationContext,
  ): Promise<TemplateRecommendation[]> {
    this.logger.log('Generating template recommendations');

    // Search knowledge base for similar templates
    const knowledgeResults = await this.searchKnowledgeBase(analysis, context);

    // Build prompt for template generation
    const prompt = this.buildTemplatePrompt(analysis, knowledgeResults);
    
    // Use OpenAIService.generateTemplate which exists and matches our needs
    const templateContext: TemplateContext = {
      industry: context.industry,
      processType: context.processType,
      complexity: this.mapComplexityToTemplateContext(analysis.complexity),
      constraints: context.constraints || [],
      preferences: context.preferences || [],
    };

    // Generate template using OpenAI
    const template = await this.openAIService.generateTemplate(
      analysis.requirements,
      templateContext,
    );

    // Convert to our TemplateRecommendation format
    const recommendation = this.convertToRecommendation(template);

    // Calculate confidence scores
    const scoredRecommendations = await this.calculateConfidenceScores([recommendation]);

    // Generate alternatives for top recommendation
    if (scoredRecommendations.length > 0) {
      const alternatives = await this.generateAlternatives(scoredRecommendations[0]);
      scoredRecommendations[0].alternatives = alternatives;
    }

    return scoredRecommendations;
  }

  /**
   * Validate recommendations
   * Design: TemplateRecommendationService.validateRecommendations()
   */
  async validateRecommendations(recommendations: TemplateRecommendation[]): Promise<ValidationResult> {
    this.logger.log(`Validating ${recommendations.length} recommendations`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const recommendation of recommendations) {
      // Validate step dependencies
      if (!this.validateStepDependencies(recommendation.steps)) {
        errors.push(`Invalid dependencies in template: ${recommendation.name}`);
      }

      // Check for circular dependencies
      if (this.detectCircularDependencies(recommendation.steps)) {
        errors.push(`Circular dependencies detected in template: ${recommendation.name}`);
      }

      // Validate critical path
      const criticalPath = this.calculateCriticalPath(recommendation.steps);
      if (criticalPath.length === 0) {
        warnings.push(`No critical path identified for template: ${recommendation.name}`);
      }

      // Check completeness
      if (recommendation.steps.length < 3) {
        warnings.push(`Template ${recommendation.name} has very few steps`);
      }

      // Provide suggestions
      if (recommendation.confidence < 0.7) {
        suggestions.push(`Consider reviewing template ${recommendation.name} due to low confidence`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Optimize step sequence
   * Design: TemplateRecommendationService.optimizeStepSequence()
   */
  async optimizeStepSequence(steps: StepRecommendation[]): Promise<StepRecommendation[]> {
    this.logger.log('Optimizing step sequence');

    // Sort steps based on dependencies and critical path
    const optimized = [...steps];
    
    // Identify critical path
    const criticalPath = this.calculateCriticalPath(steps);
    
    // Mark critical path steps
    optimized.forEach(step => {
      step.criticalPath = criticalPath.some(cp => cp.id === step.id);
    });

    // Sort by dependencies and priority
    optimized.sort((a, b) => {
      // Critical path steps come first
      if (a.criticalPath && !b.criticalPath) return -1;
      if (!a.criticalPath && b.criticalPath) return 1;
      
      // Then by number of dependencies
      return a.dependencies.length - b.dependencies.length;
    });

    return optimized;
  }

  /**
   * Calculate confidence scores
   * Design: TemplateRecommendationService.calculateConfidenceScores()
   */
  async calculateConfidenceScores(recommendations: TemplateRecommendation[]): Promise<TemplateRecommendation[]> {
    return recommendations.map(rec => {
      let confidence = 0.5; // Base confidence

      // Increase confidence based on completeness
      if (rec.steps.length >= 5) confidence += 0.1;
      if (rec.steps.length >= 10) confidence += 0.1;

      // Increase confidence if rationale is provided
      if (rec.rationale.length >= 3) confidence += 0.15;

      // Adjust based on complexity
      if (rec.complexity === ComplexityLevel.SIMPLE) confidence += 0.1;
      if (rec.complexity === ComplexityLevel.COMPLEX || rec.complexity === ComplexityLevel.VERY_COMPLEX) confidence -= 0.05;

      // Cap confidence
      rec.confidence = Math.min(0.95, Math.max(0.3, confidence));
      return rec;
    });
  }

  /**
   * Generate alternatives
   * Design: TemplateRecommendationService.generateAlternatives()
   */
  async generateAlternatives(primary: TemplateRecommendation): Promise<TemplateRecommendation[]> {
    this.logger.log('Generating alternative recommendations');

    const alternatives: TemplateRecommendation[] = [];

    // Generate simplified version
    const simplified: TemplateRecommendation = {
      ...primary,
      id: `${primary.id}-simplified`,
      name: `${primary.name} (Simplified)`,
      description: `Simplified version of ${primary.name}`,
      steps: primary.steps.filter(s => s.criticalPath),
      complexity: ComplexityLevel.SIMPLE,
      confidence: primary.confidence * 0.9,
    };
    alternatives.push(simplified);

    // Generate extended version
    const extended: TemplateRecommendation = {
      ...primary,
      id: `${primary.id}-extended`,
      name: `${primary.name} (Extended)`,
      description: `Extended version of ${primary.name} with additional quality checks`,
      steps: [...primary.steps],
      complexity: ComplexityLevel.COMPLEX,
      confidence: primary.confidence * 0.85,
    };
    
    // Add quality check steps
    extended.steps.push({
      id: 'quality-review',
      name: 'Quality Review',
      description: 'Comprehensive quality review of all deliverables',
      duration: 8,
      dependencies: primary.steps.map(s => s.id),
      artifacts: ['Quality Report'],
      responsible: 'Quality Assurance',
      criticalPath: false,
    });
    
    alternatives.push(extended);

    return alternatives;
  }

  /**
   * Private helper methods
   */
  private async searchKnowledgeBase(
    analysis: ProcessAnalysis,
    context: RecommendationContext,
  ): Promise<KnowledgeBaseResult[]> {
    try {
      // Use existing KnowledgeBaseService methods
      const templates = await this.knowledgeService.getRelatedTemplates({
        industry: context.industry,
        processType: context.processType,
        category: analysis.category,
        complexity: analysis.complexity,
      });

      // Convert to KnowledgeBaseResult format
      return templates.map(t => ({
        source: 'knowledge_base',
        relevance: 0.7,
        content: JSON.stringify(t),
        metadata: t,
      }));
    } catch (error) {
      this.logger.warn('Knowledge base search failed, continuing without it', error);
      return [];
    }
  }

  private buildTemplatePrompt(analysis: ProcessAnalysis, knowledge: KnowledgeBaseResult[]): string {
    const requirementsText = analysis.requirements
      .map(r => `- ${r.description} (Priority: ${r.priority})`)
      .join('\n');

    const stakeholdersText = analysis.stakeholders
      .map(s => `- ${s.role}: ${s.responsibilities.join(', ')}`)
      .join('\n');

    const knowledgeText = knowledge
      .slice(0, 3)
      .map(k => k.content)
      .join('\n\n');

    return `Generate a process template based on the following analysis:

Requirements:
${requirementsText}

Stakeholders:
${stakeholdersText}

Complexity: ${analysis.complexity}
Category: ${analysis.category}

${knowledgeText ? `Relevant Knowledge:\n${knowledgeText}\n` : ''}

Provide a detailed template with:
1. Name and description
2. Step-by-step process with dependencies
3. Duration estimates
4. Required artifacts
5. Responsible parties
6. Rationale for the approach`;
  }

  private parseTemplateResponse(response: string): TemplateRecommendation {
    // This method is kept for potential direct AI response parsing
    // Currently using convertToRecommendation instead
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return this.mapToTemplateRecommendation(data);
      }
    } catch (error) {
      this.logger.error('Failed to parse template response', error);
    }

    // Return default template if parsing fails
    return this.createDefaultTemplate();
  }

  private validateStepDependencies(steps: StepRecommendation[]): boolean {
    const stepIds = new Set(steps.map(s => s.id));
    
    for (const step of steps) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private detectCircularDependencies(steps: StepRecommendation[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const dep of step.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true;
      }
    }

    return false;
  }

  private calculateCriticalPath(steps: StepRecommendation[]): StepRecommendation[] {
    // Simplified critical path calculation
    const path: StepRecommendation[] = [];
    const stepMap = new Map(steps.map(s => [s.id, s]));
    
    // Find steps with no dependencies (start nodes)
    const startSteps = steps.filter(s => s.dependencies.length === 0);
    
    // Find steps that no other steps depend on (end nodes)
    const endSteps = steps.filter(s => 
      !steps.some(other => other.dependencies.includes(s.id))
    );
    
    // For simplicity, return the longest path from start to end
    if (startSteps.length > 0 && endSteps.length > 0) {
      path.push(...startSteps);
      path.push(...endSteps);
    }
    
    return path;
  }

  private convertToRecommendation(template: any): TemplateRecommendation {
    // Convert OpenAIService template response to our format
    return {
      id: template.id || `template-${Date.now()}`,
      name: template.name || 'Generated Process Template',
      description: template.description || 'AI-generated template based on requirements',
      steps: this.convertSteps(template.steps || []),
      confidence: template.confidence || 0.7,
      rationale: template.rationale || ['Generated based on requirements analysis'],
      estimatedDuration: template.estimatedDuration || this.calculateTotalDuration(template.steps || []),
      complexity: template.complexity || 'medium',
    };
  }

  private convertSteps(steps: any[]): StepRecommendation[] {
    return steps.map((step, index) => ({
      id: step.id || `step-${index}`,
      name: step.name || `Step ${index + 1}`,
      description: step.description || '',
      duration: step.duration || 8,
      dependencies: step.dependencies || [],
      artifacts: step.artifacts || [],
      responsible: step.responsible || 'Team',
      criticalPath: false,
    }));
  }

  private calculateTotalDuration(steps: any[]): number {
    if (!steps || steps.length === 0) return 0;
    return steps.reduce((total, step) => total + (step.duration || 0), 0);
  }

  private mapComplexityToTemplateContext(complexity: string): 'simple' | 'medium' | 'complex' {
    switch (complexity) {
      case 'simple':
        return 'simple';
      case 'moderate':
        return 'medium';
      case 'complex':
      case 'highly_complex':
        return 'complex';
      default:
        return 'medium';
    }
  }

  private mapToTemplateRecommendation(data: any): TemplateRecommendation {
    return {
      id: data.id || `template-${Date.now()}`,
      name: data.name || 'Unnamed Template',
      description: data.description || '',
      steps: this.convertSteps(data.steps || []),
      confidence: data.confidence || 0.7,
      rationale: data.rationale || [],
      estimatedDuration: data.estimatedDuration || 40,
      complexity: data.complexity || 'medium',
    };
  }

  private createDefaultTemplate(): TemplateRecommendation {
    return {
      id: `template-${Date.now()}`,
      name: 'Standard Process Template',
      description: 'A standard process template based on requirements',
      steps: [],
      confidence: 0.5,
      rationale: ['Generated based on provided requirements'],
      estimatedDuration: 40,
      complexity: ComplexityLevel.MEDIUM,
    };
  }
}