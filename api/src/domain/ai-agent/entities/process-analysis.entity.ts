import { ConfidenceScore } from '../value-objects/confidence-score.vo';

/**
 * Stakeholder
 */
export interface Stakeholder {
  name: string;
  role: string;
  responsibility: string;
  influence: 'high' | 'medium' | 'low';
  availability: string;
}

/**
 * Deliverable
 */
export interface Deliverable {
  name: string;
  description: string;
  type: 'document' | 'artifact' | 'approval' | 'milestone';
  format?: string;
  qualityCriteria: string[];
  dependencies: string[];
}

/**
 * Constraint
 */
export interface Constraint {
  type: 'time' | 'budget' | 'resource' | 'technical' | 'regulatory';
  description: string;
  impact: 'high' | 'medium' | 'low';
  mitigation?: string;
}

/**
 * Risk
 */
export interface Risk {
  description: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
  owner?: string;
}

/**
 * Compliance Requirement
 */
export interface ComplianceRequirement {
  regulation: string;
  description: string;
  applicableSteps: string[];
  mandatoryControls: string[];
  documentation: string[];
  auditRequirements: string[];
}

/**
 * Process Category
 */
export enum ProcessCategory {
  DEVELOPMENT = 'development',
  MARKETING = 'marketing',
  SALES = 'sales',
  OPERATIONS = 'operations',
  HR = 'hr',
  FINANCE = 'finance',
  LEGAL = 'legal',
  PROCUREMENT = 'procurement',
  MANUFACTURING = 'manufacturing',
  QUALITY_ASSURANCE = 'quality_assurance',
  CUSTOMER_SERVICE = 'customer_service',
  RESEARCH = 'research'
}

/**
 * Complexity Level
 */
export enum ComplexityLevel {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}

/**
 * Process Analysis Entity
 * Represents the analyzed requirements and context
 */
export class ProcessAnalysis {
  private readonly id: string;
  private readonly processType: ProcessCategory;
  private readonly complexity: ComplexityLevel;
  private readonly estimatedDuration: number;
  private readonly stakeholders: Stakeholder[];
  private readonly deliverables: Deliverable[];
  private readonly constraints: Constraint[];
  private readonly risks: Risk[];
  private readonly complianceRequirements: ComplianceRequirement[];
  private readonly confidence: ConfidenceScore;
  private readonly analyzedAt: Date;

  constructor(params: {
    id: string;
    processType: ProcessCategory;
    complexity: ComplexityLevel;
    estimatedDuration: number;
    stakeholders: Stakeholder[];
    deliverables: Deliverable[];
    constraints?: Constraint[];
    risks?: Risk[];
    complianceRequirements?: ComplianceRequirement[];
    confidence: ConfidenceScore | number;
    analyzedAt?: Date;
  }) {
    this.id = params.id;
    this.processType = params.processType;
    this.complexity = params.complexity;
    this.estimatedDuration = params.estimatedDuration;
    this.stakeholders = params.stakeholders;
    this.deliverables = params.deliverables;
    this.constraints = params.constraints || [];
    this.risks = params.risks || [];
    this.complianceRequirements = params.complianceRequirements || [];
    this.confidence = params.confidence instanceof ConfidenceScore
      ? params.confidence
      : new ConfidenceScore(params.confidence);
    this.analyzedAt = params.analyzedAt || new Date();

    this.validate();
  }

  /**
   * Validate analysis
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('Analysis ID is required');
    }

    if (!this.processType) {
      throw new Error('Process type is required');
    }

    if (!this.complexity) {
      throw new Error('Complexity level is required');
    }

    if (this.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be positive');
    }

    if (!this.stakeholders || this.stakeholders.length === 0) {
      throw new Error('At least one stakeholder is required');
    }

    if (!this.deliverables || this.deliverables.length === 0) {
      throw new Error('At least one deliverable is required');
    }
  }

  /**
   * Get analysis ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get process type
   */
  getProcessType(): ProcessCategory {
    return this.processType;
  }

  /**
   * Get complexity level
   */
  getComplexity(): ComplexityLevel {
    return this.complexity;
  }

  /**
   * Get estimated duration
   */
  getEstimatedDuration(): number {
    return this.estimatedDuration;
  }

  /**
   * Get stakeholders
   */
  getStakeholders(): Stakeholder[] {
    return [...this.stakeholders];
  }

  /**
   * Get deliverables
   */
  getDeliverables(): Deliverable[] {
    return [...this.deliverables];
  }

  /**
   * Get constraints
   */
  getConstraints(): Constraint[] {
    return [...this.constraints];
  }

  /**
   * Get risks
   */
  getRisks(): Risk[] {
    return [...this.risks];
  }

  /**
   * Get compliance requirements
   */
  getComplianceRequirements(): ComplianceRequirement[] {
    return [...this.complianceRequirements];
  }

  /**
   * Get confidence score
   */
  getConfidence(): ConfidenceScore {
    return this.confidence;
  }

  /**
   * Get analysis timestamp
   */
  getAnalyzedAt(): Date {
    return this.analyzedAt;
  }

  /**
   * Get key stakeholders (high influence)
   */
  getKeyStakeholders(): Stakeholder[] {
    return this.stakeholders.filter(s => s.influence === 'high');
  }

  /**
   * Get critical constraints (high impact)
   */
  getCriticalConstraints(): Constraint[] {
    return this.constraints.filter(c => c.impact === 'high');
  }

  /**
   * Get high risks
   */
  getHighRisks(): Risk[] {
    return this.risks.filter(r => 
      r.probability === 'high' || r.impact === 'high'
    );
  }

  /**
   * Get milestone deliverables
   */
  getMilestoneDeliverables(): Deliverable[] {
    return this.deliverables.filter(d => d.type === 'milestone');
  }

  /**
   * Check if has compliance requirements
   */
  hasComplianceRequirements(): boolean {
    return this.complianceRequirements.length > 0;
  }

  /**
   * Check if has high risks
   */
  hasHighRisks(): boolean {
    return this.getHighRisks().length > 0;
  }

  /**
   * Check if analysis has high confidence
   */
  hasHighConfidence(threshold: number = 0.7): boolean {
    return this.confidence.isAbove(threshold);
  }

  /**
   * Get complexity weight
   */
  getComplexityWeight(): number {
    const weights: Record<ComplexityLevel, number> = {
      [ComplexityLevel.SIMPLE]: 1,
      [ComplexityLevel.MEDIUM]: 2,
      [ComplexityLevel.COMPLEX]: 3,
      [ComplexityLevel.VERY_COMPLEX]: 4,
    };
    return weights[this.complexity];
  }

  /**
   * Get risk score
   */
  getRiskScore(): number {
    if (this.risks.length === 0) return 0;

    const riskWeights = {
      high: 3,
      medium: 2,
      low: 1,
    };

    let totalScore = 0;
    for (const risk of this.risks) {
      const probWeight = riskWeights[risk.probability];
      const impactWeight = riskWeights[risk.impact];
      totalScore += probWeight * impactWeight;
    }

    return totalScore / this.risks.length;
  }

  /**
   * Get analysis summary
   */
  getSummary(): string {
    return `Process: ${this.processType}, ` +
           `Complexity: ${this.complexity}, ` +
           `Duration: ${this.estimatedDuration} days, ` +
           `Stakeholders: ${this.stakeholders.length}, ` +
           `Deliverables: ${this.deliverables.length}, ` +
           `Risks: ${this.risks.length}, ` +
           `Confidence: ${this.confidence.toPercentageString()}`;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      processType: this.processType,
      complexity: this.complexity,
      estimatedDuration: this.estimatedDuration,
      stakeholders: this.stakeholders,
      deliverables: this.deliverables,
      constraints: this.constraints,
      risks: this.risks,
      complianceRequirements: this.complianceRequirements,
      confidence: this.confidence.getValue(),
      analyzedAt: this.analyzedAt.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: Record<string, any>): ProcessAnalysis {
    return new ProcessAnalysis({
      id: data.id,
      processType: data.processType,
      complexity: data.complexity,
      estimatedDuration: data.estimatedDuration,
      stakeholders: data.stakeholders,
      deliverables: data.deliverables,
      constraints: data.constraints,
      risks: data.risks,
      complianceRequirements: data.complianceRequirements,
      confidence: data.confidence,
      analyzedAt: data.analyzedAt ? new Date(data.analyzedAt) : undefined,
    });
  }
}