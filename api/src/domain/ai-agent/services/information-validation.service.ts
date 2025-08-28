import { Injectable, Logger } from '@nestjs/common';
import { TemplateRecommendation, StepRecommendation } from './template-recommendation.service';
import { ProcessRequirement } from './process-analysis.service';

// Domain types as per design document
export interface SourceReliability {
  url: string;
  credibility: number;
  lastVerified: Date;
  trustLevel: 'high' | 'medium' | 'low';
}

export interface ValidationReport {
  overallValid: boolean;
  requirementsValid: boolean;
  templateValid: boolean;
  stepsValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completenessScore: number;
}

export interface ValidationError {
  type: 'requirement' | 'template' | 'step' | 'dependency' | 'constraint';
  message: string;
  field?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

export interface ProcessInsight {
  id: string;
  category: string;
  insight: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  source: string;
}

export interface CredibilityScore {
  score: number;
  factors: string[];
  lastUpdated: Date;
}

export interface BiasAnalysis {
  hasBias: boolean;
  biasType?: string;
  confidence: number;
  explanation?: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  supportingSources: string[];
  conflictingSources: string[];
}

export interface ResearchResult {
  title: string;
  source: string;
  url?: string;
  content: string;
  relevance: number;
  publishedAt?: Date;
}

export interface SourceMetadata {
  domain: string;
  author?: string;
  publishedDate?: Date;
  lastModified?: Date;
  contentType: string;
}

/**
 * Information Validation Service
 * As per ai_agent_class_diagram.md specification
 */
@Injectable()
export class InformationValidationService {
  private readonly logger = new Logger(InformationValidationService.name);

  private readonly trustedDomains = [
    'gartner.com',
    'forrester.com',
    'mckinsey.com',
    'harvard.edu',
    'mit.edu',
    'ieee.org',
    'acm.org',
  ];

  /**
   * Validate source reliability
   * Design: InformationValidationService.validateSource()
   */
  async validateSource(url: string): Promise<SourceReliability> {
    this.logger.log(`Validating source: ${url}`);

    const domain = this.extractDomain(url);
    const credibility = await this.checkSourceCredibility(domain);

    return {
      url,
      credibility: credibility.score,
      lastVerified: new Date(),
      trustLevel: this.determineTrustLevel(credibility.score),
    };
  }

  /**
   * Cross-reference information from multiple sources
   * Design: InformationValidationService.crossReferenceInformation()
   */
  async crossReferenceInformation(results: ResearchResult[]): Promise<ValidationReport> {
    this.logger.log(`Cross-referencing ${results.length} results`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for conflicting information
    const conflicts = this.detectConflicts(results);
    if (conflicts.length > 0) {
      warnings.push({
        type: 'conflict',
        message: `Found ${conflicts.length} conflicting pieces of information`,
        suggestion: 'Review and verify conflicting sources manually',
      });
    }

    // Calculate consensus score
    const consensusScore = this.calculateConsensusScore(results);
    if (consensusScore < 0.5) {
      warnings.push({
        type: 'consensus',
        message: 'Low consensus among sources',
        suggestion: 'Seek additional authoritative sources',
      });
    }

    // Validate source credibility
    for (const result of results) {
      if (result.url) {
        const reliability = await this.validateSource(result.url);
        if (reliability.trustLevel === 'low') {
          warnings.push({
            type: 'source',
            message: `Low credibility source: ${result.source}`,
            suggestion: 'Consider more authoritative sources',
          });
        }
      }
    }

    const completenessScore = Math.round(consensusScore * 100);

    return {
      overallValid: errors.filter(e => e.severity === 'critical').length === 0,
      requirementsValid: true,
      templateValid: true,
      stepsValid: true,
      errors,
      warnings,
      completenessScore,
    };
  }

  /**
   * Extract actionable insights
   * Design: InformationValidationService.extractActionableInsights()
   */
  async extractActionableInsights(results: ResearchResult[]): Promise<ProcessInsight[]> {
    this.logger.log('Extracting actionable insights');

    const insights: ProcessInsight[] = [];

    for (const result of results) {
      const extractedInsights = this.extractInsightsFromContent(result.content);
      
      insights.push(...extractedInsights.map((insight, index) => ({
        id: `insight-${Date.now()}-${index}`,
        category: this.categorizeInsight(insight),
        insight,
        actionable: this.isActionable(insight),
        priority: this.determinePriority(insight, result.relevance),
        source: result.source,
      })));
    }

    // Sort by priority and actionability
    insights.sort((a, b) => {
      if (a.actionable && !b.actionable) return -1;
      if (!a.actionable && b.actionable) return 1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return insights;
  }

  /**
   * Check source credibility
   * Design: InformationValidationService.checkSourceCredibility()
   */
  async checkSourceCredibility(domain: string): Promise<CredibilityScore> {
    const factors: string[] = [];
    let score = 0.5; // Base score

    // Check if trusted domain
    if (this.trustedDomains.includes(domain)) {
      score += 0.3;
      factors.push('Trusted domain');
    }

    // Check domain characteristics
    if (domain.endsWith('.edu')) {
      score += 0.2;
      factors.push('Educational institution');
    } else if (domain.endsWith('.gov')) {
      score += 0.2;
      factors.push('Government source');
    } else if (domain.endsWith('.org')) {
      score += 0.1;
      factors.push('Organization');
    }

    // Check for known unreliable patterns
    const unreliablePatterns = ['blog', 'wiki', 'forum'];
    if (unreliablePatterns.some(pattern => domain.includes(pattern))) {
      score -= 0.2;
      factors.push('User-generated content');
    }

    return {
      score: Math.min(1, Math.max(0, score)),
      factors,
      lastUpdated: new Date(),
    };
  }

  /**
   * Detect bias in content
   * Design: InformationValidationService.detectBias()
   */
  async detectBias(content: string): Promise<BiasAnalysis> {
    const biasIndicators = {
      promotional: ['best', 'leading', 'top', 'premier', 'exclusive'],
      emotional: ['amazing', 'terrible', 'horrible', 'fantastic', 'awful'],
      absolutist: ['always', 'never', 'all', 'none', 'every'],
    };

    let biasType: string | undefined;
    let biasScore = 0;

    for (const [type, indicators] of Object.entries(biasIndicators)) {
      const matches = indicators.filter(indicator => 
        content.toLowerCase().includes(indicator)
      );
      
      if (matches.length > 0) {
        biasScore += matches.length * 0.1;
        if (!biasType || matches.length > 2) {
          biasType = type;
        }
      }
    }

    const hasBias = biasScore > 0.3;

    return {
      hasBias,
      biasType: hasBias ? biasType : undefined,
      confidence: Math.min(1, biasScore),
      explanation: hasBias ? `Detected ${biasType} bias indicators` : undefined,
    };
  }

  /**
   * Verify information against multiple sources
   * Design: InformationValidationService.verifyInformation()
   */
  async verifyInformation(claim: string, sources: string[]): Promise<VerificationResult> {
    const supportingSources: string[] = [];
    const conflictingSources: string[] = [];

    // Simplified verification - in production would use NLP
    for (const source of sources) {
      // For now, randomly assign as supporting or conflicting
      // In real implementation, would analyze content
      if (Math.random() > 0.3) {
        supportingSources.push(source);
      } else {
        conflictingSources.push(source);
      }
    }

    const supportRatio = supportingSources.length / sources.length;

    return {
      verified: supportRatio > 0.6,
      confidence: supportRatio,
      supportingSources,
      conflictingSources,
    };
  }

  /**
   * Validate template against requirements
   */
  async validateTemplate(template: TemplateRecommendation): Promise<ValidationReport> {
    this.logger.log(`Validating template: ${template.name}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate template basics
    if (!template.name || template.name.trim().length === 0) {
      errors.push({
        type: 'template',
        message: 'Template name is required',
        field: 'name',
        severity: 'critical',
      });
    }

    if (!template.description || template.description.trim().length < 10) {
      errors.push({
        type: 'template',
        message: 'Template description must be at least 10 characters',
        field: 'description',
        severity: 'major',
      });
    }

    // Validate steps
    const stepsValid = await this.validateSteps(template.steps, errors, warnings);

    // Check for circular dependencies
    if (this.hasCircularDependencies(template.steps)) {
      errors.push({
        type: 'dependency',
        message: 'Circular dependencies detected in template steps',
        severity: 'critical',
      });
    }

    // Calculate completeness
    const completenessScore = this.calculateCompleteness(template);

    if (completenessScore < 60) {
      warnings.push({
        type: 'completeness',
        message: `Template completeness is low: ${completenessScore}%`,
        suggestion: 'Consider adding more details to steps and artifacts',
      });
    }

    return {
      overallValid: errors.filter(e => e.severity === 'critical').length === 0,
      requirementsValid: true,
      templateValid: errors.filter(e => e.type === 'template').length === 0,
      stepsValid,
      errors,
      warnings,
      completenessScore,
    };
  }

  /**
   * Private helper methods
   */
  private analyzeSourceMetadata(metadata: SourceMetadata): SourceReliability {
    const credibility = this.calculateMetadataCredibility(metadata);
    
    return {
      url: metadata.domain,
      credibility,
      lastVerified: new Date(),
      trustLevel: this.determineTrustLevel(credibility),
    };
  }

  private calculateConsensusScore(sources: ResearchResult[]): number {
    if (sources.length === 0) return 0;
    
    // Simple consensus based on source agreement
    // In production, would use NLP to compare content
    const uniqueSources = new Set(sources.map(s => s.source));
    const consensusRatio = uniqueSources.size / sources.length;
    
    return Math.min(1, consensusRatio * 1.5);
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private determineTrustLevel(credibility: number): 'high' | 'medium' | 'low' {
    if (credibility >= 0.8) return 'high';
    if (credibility >= 0.5) return 'medium';
    return 'low';
  }

  private detectConflicts(results: ResearchResult[]): Array<{ source1: string; source2: string; topic: string }> {
    const conflicts: Array<{ source1: string; source2: string; topic: string }> = [];
    
    // Simplified conflict detection
    // In production, would use NLP to compare content
    
    return conflicts;
  }

  private extractInsightsFromContent(content: string): string[] {
    const insights: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      // Look for actionable insights
      if (
        trimmed.match(/should|must|recommend|best practice|important/i) ||
        trimmed.match(/\d+%/) || // Contains percentage
        trimmed.match(/increase|decrease|improve|optimize/i)
      ) {
        insights.push(trimmed);
        if (insights.length >= 5) break;
      }
    }
    
    return insights;
  }

  private categorizeInsight(insight: string): string {
    if (insight.match(/performance|speed|efficiency/i)) return 'performance';
    if (insight.match(/cost|budget|expense/i)) return 'cost';
    if (insight.match(/quality|accuracy|error/i)) return 'quality';
    if (insight.match(/security|safety|risk/i)) return 'security';
    if (insight.match(/compliance|regulation|standard/i)) return 'compliance';
    return 'general';
  }

  private isActionable(insight: string): boolean {
    const actionablePatterns = [
      /should/i,
      /must/i,
      /need to/i,
      /recommend/i,
      /implement/i,
      /consider/i,
      /ensure/i,
    ];
    
    return actionablePatterns.some(pattern => pattern.test(insight));
  }

  private determinePriority(insight: string, relevance: number): 'high' | 'medium' | 'low' {
    let priority = 'medium' as 'high' | 'medium' | 'low';
    
    if (insight.match(/critical|urgent|immediate|must/i)) {
      priority = 'high';
    } else if (insight.match(/optional|consider|may|could/i)) {
      priority = 'low';
    }
    
    // Adjust based on relevance
    if (relevance > 0.8 && priority === 'medium') {
      priority = 'high';
    } else if (relevance < 0.5 && priority === 'medium') {
      priority = 'low';
    }
    
    return priority;
  }

  private calculateMetadataCredibility(metadata: SourceMetadata): number {
    let score = 0.5;
    
    // Author credibility
    if (metadata.author) {
      score += 0.1;
    }
    
    // Recency
    if (metadata.publishedDate) {
      const ageInDays = (Date.now() - metadata.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 365) {
        score += 0.2;
      } else if (ageInDays < 730) {
        score += 0.1;
      }
    }
    
    // Content type
    if (metadata.contentType === 'research' || metadata.contentType === 'whitepaper') {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }

  private async validateSteps(
    steps: StepRecommendation[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<boolean> {
    if (!steps || steps.length === 0) {
      errors.push({
        type: 'step',
        message: 'Template must have at least one step',
        severity: 'critical',
      });
      return false;
    }

    const stepIds = new Set<string>();
    for (const step of steps) {
      // Check for duplicate IDs
      if (stepIds.has(step.id)) {
        errors.push({
          type: 'step',
          message: `Duplicate step ID: ${step.id}`,
          severity: 'critical',
        });
      }
      stepIds.add(step.id);

      // Validate step properties
      if (!step.name || step.name.trim().length === 0) {
        errors.push({
          type: 'step',
          message: `Step ${step.id} has no name`,
          field: `steps.${step.id}.name`,
          severity: 'major',
        });
      }

      if (step.duration <= 0 || step.duration > 480) {
        warnings.push({
          type: 'step',
          message: `Step ${step.name} has unusual duration: ${step.duration} hours`,
          suggestion: 'Typical step duration is between 1 and 40 hours',
        });
      }

      // Validate dependencies
      for (const dep of step.dependencies) {
        if (dep === step.id) {
          errors.push({
            type: 'dependency',
            message: `Step ${step.id} cannot depend on itself`,
            severity: 'critical',
          });
        }
      }
    }

    return errors.filter(e => e.type === 'step' && e.severity === 'critical').length === 0;
  }

  private hasCircularDependencies(steps: StepRecommendation[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.id, s]));

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
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

  private calculateCompleteness(template: TemplateRecommendation): number {
    let score = 0;
    let maxScore = 0;

    // Template level scoring
    maxScore += 20;
    if (template.name && template.name.length > 0) score += 10;
    if (template.description && template.description.length > 20) score += 10;

    maxScore += 15;
    if (template.rationale && template.rationale.length > 0) score += 15;

    maxScore += 10;
    if (template.estimatedDuration > 0) score += 10;

    // Steps scoring
    maxScore += 20;
    if (template.steps.length >= 3) score += 10;
    if (template.steps.length >= 5) score += 10;

    // Step details scoring
    for (const step of template.steps) {
      maxScore += 10;
      if (step.description && step.description.length > 10) score += 3;
      if (step.artifacts && step.artifacts.length > 0) score += 3;
      if (step.responsible && step.responsible !== 'TBD') score += 2;
      if (step.duration > 0) score += 2;
    }

    return Math.round((score / maxScore) * 100);
  }
}