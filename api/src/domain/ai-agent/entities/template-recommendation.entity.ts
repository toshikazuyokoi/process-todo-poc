import { RequirementCategory } from '../enums/requirement-category.enum';
import { ConfidenceScore } from '../value-objects/confidence-score.vo';

/**
 * Required Artifact
 */
export interface RequiredArtifact {
  kind: string;
  description: string;
  format?: string;
  template?: string;
  qualityCriteria?: string[];
  approvalRequired?: boolean;
}

/**
 * Alternative Step
 */
export interface AlternativeStep {
  name: string;
  description: string;
  offsetDays: number;
  reasoning: string;
  confidence: number;
}

/**
 * Step Recommendation
 */
export interface StepRecommendation {
  id: number;
  name: string;
  description: string;
  basis: 'goal' | 'prev';
  offsetDays: number;
  confidence: number;
  reasoning: string;
  requiredArtifacts: RequiredArtifact[];
  dependsOn: number[];
  alternatives: AlternativeStep[];
  source: 'knowledge_base' | 'ai_generated' | 'best_practice';
  estimatedHours?: number;
  skillsRequired?: string[];
  risks?: string[];
}

/**
 * Alternative Recommendation
 */
export interface AlternativeRecommendation {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  suitableFor: string[];
  confidence: number;
}

/**
 * Template Recommendation Entity
 * Represents an AI-generated template recommendation
 */
export class TemplateRecommendation {
  private readonly id: string;
  private readonly name: string;
  private readonly description: string;
  private readonly stepRecommendations: StepRecommendation[];
  private readonly alternatives: AlternativeRecommendation[];
  private readonly confidence: ConfidenceScore;
  private readonly reasoning: string;
  private readonly estimatedDuration: number;
  private readonly complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
  private readonly sources: string[];
  private readonly createdAt: Date;

  constructor(params: {
    id: string;
    name: string;
    description: string;
    stepRecommendations: StepRecommendation[];
    alternatives?: AlternativeRecommendation[];
    confidence: ConfidenceScore | number;
    reasoning: string;
    estimatedDuration: number;
    complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
    sources?: string[];
    createdAt?: Date;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.stepRecommendations = params.stepRecommendations;
    this.alternatives = params.alternatives || [];
    this.confidence = params.confidence instanceof ConfidenceScore
      ? params.confidence
      : new ConfidenceScore(params.confidence);
    this.reasoning = params.reasoning;
    this.estimatedDuration = params.estimatedDuration;
    this.complexity = params.complexity;
    this.sources = params.sources || [];
    this.createdAt = params.createdAt || new Date();

    this.validate();
  }

  /**
   * Validate template recommendation
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('Template recommendation ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Template description is required');
    }

    if (!this.stepRecommendations || this.stepRecommendations.length === 0) {
      throw new Error('At least one step recommendation is required');
    }

    if (this.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be positive');
    }

    // Validate step dependencies
    this.validateStepDependencies();

    // Check for circular dependencies
    if (this.hasCircularDependencies()) {
      throw new Error('Circular dependencies detected in step recommendations');
    }
  }

  /**
   * Validate step dependencies
   */
  private validateStepDependencies(): void {
    const stepIds = new Set(this.stepRecommendations.map(s => s.id));
    
    for (const step of this.stepRecommendations) {
      for (const dep of step.dependsOn) {
        if (!stepIds.has(dep)) {
          throw new Error(`Step ${step.id} depends on non-existent step ${dep}`);
        }
        if (dep === step.id) {
          throw new Error(`Step ${step.id} cannot depend on itself`);
        }
      }
    }
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependencies(): boolean {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCircularDep = (stepId: number): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = this.stepRecommendations.find(s => s.id === stepId);
      if (!step) return false;

      for (const dep of step.dependsOn) {
        if (!visited.has(dep)) {
          if (hasCircularDep(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of this.stepRecommendations) {
      if (!visited.has(step.id)) {
        if (hasCircularDep(step.id)) return true;
      }
    }

    return false;
  }

  /**
   * Get template ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get template name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get template description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get step recommendations
   */
  getStepRecommendations(): StepRecommendation[] {
    return [...this.stepRecommendations];
  }

  /**
   * Get alternatives
   */
  getAlternatives(): AlternativeRecommendation[] {
    return [...this.alternatives];
  }

  /**
   * Get confidence score
   */
  getConfidence(): ConfidenceScore {
    return this.confidence;
  }

  /**
   * Get reasoning
   */
  getReasoning(): string {
    return this.reasoning;
  }

  /**
   * Get estimated duration
   */
  getEstimatedDuration(): number {
    return this.estimatedDuration;
  }

  /**
   * Get complexity
   */
  getComplexity(): string {
    return this.complexity;
  }

  /**
   * Get sources
   */
  getSources(): string[] {
    return [...this.sources];
  }

  /**
   * Get creation timestamp
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Get step count
   */
  getStepCount(): number {
    return this.stepRecommendations.length;
  }

  /**
   * Get critical path
   */
  getCriticalPath(): StepRecommendation[] {
    // Implementation of critical path algorithm
    const stepMap = new Map(this.stepRecommendations.map(s => [s.id, s]));
    const memo = new Map<number, number>();

    const getMaxPath = (stepId: number): number => {
      if (memo.has(stepId)) return memo.get(stepId)!;

      const step = stepMap.get(stepId);
      if (!step) return 0;

      let maxDepPath = 0;
      for (const dep of step.dependsOn) {
        maxDepPath = Math.max(maxDepPath, getMaxPath(dep));
      }

      const pathLength = step.offsetDays + maxDepPath;
      memo.set(stepId, pathLength);
      return pathLength;
    };

    // Find the longest path
    let maxPath = 0;
    let endStepId = -1;
    for (const step of this.stepRecommendations) {
      const pathLength = getMaxPath(step.id);
      if (pathLength > maxPath) {
        maxPath = pathLength;
        endStepId = step.id;
      }
    }

    // Reconstruct critical path
    const criticalPath: StepRecommendation[] = [];
    const visited = new Set<number>();

    const buildPath = (stepId: number): void => {
      if (visited.has(stepId)) return;
      visited.add(stepId);

      const step = stepMap.get(stepId);
      if (!step) return;

      for (const dep of step.dependsOn) {
        buildPath(dep);
      }
      criticalPath.push(step);
    };

    if (endStepId !== -1) {
      buildPath(endStepId);
    }

    return criticalPath;
  }

  /**
   * Check if template has high confidence
   */
  hasHighConfidence(threshold: number = 0.7): boolean {
    return this.confidence.isAbove(threshold);
  }

  /**
   * Get total estimated hours
   */
  getTotalEstimatedHours(): number {
    return this.stepRecommendations.reduce(
      (total, step) => total + (step.estimatedHours || 0),
      0
    );
  }

  /**
   * Get all required skills
   */
  getRequiredSkills(): string[] {
    const skills = new Set<string>();
    for (const step of this.stepRecommendations) {
      if (step.skillsRequired) {
        step.skillsRequired.forEach(skill => skills.add(skill));
      }
    }
    return Array.from(skills);
  }

  /**
   * Get all risks
   */
  getAllRisks(): string[] {
    const risks: string[] = [];
    for (const step of this.stepRecommendations) {
      if (step.risks) {
        risks.push(...step.risks);
      }
    }
    return risks;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      stepRecommendations: this.stepRecommendations,
      alternatives: this.alternatives,
      confidence: this.confidence.getValue(),
      reasoning: this.reasoning,
      estimatedDuration: this.estimatedDuration,
      complexity: this.complexity,
      sources: this.sources,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: Record<string, any>): TemplateRecommendation {
    return new TemplateRecommendation({
      id: data.id,
      name: data.name,
      description: data.description,
      stepRecommendations: data.stepRecommendations,
      alternatives: data.alternatives,
      confidence: data.confidence,
      reasoning: data.reasoning,
      estimatedDuration: data.estimatedDuration,
      complexity: data.complexity,
      sources: data.sources,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    });
  }
}