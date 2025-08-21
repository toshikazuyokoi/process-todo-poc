import { RequirementCategory, RequirementPriority } from '../enums/requirement-category.enum';
import { ConfidenceScore } from '../value-objects/confidence-score.vo';

/**
 * Process Requirement Entity
 * Represents a requirement extracted from the conversation
 */
export class ProcessRequirement {
  private readonly id: string;
  private readonly category: RequirementCategory;
  private readonly description: string;
  private readonly priority: RequirementPriority;
  private readonly confidence: ConfidenceScore;
  private readonly extractedFrom: string; // Message ID
  private readonly entities?: Record<string, any>;
  private readonly createdAt: Date;

  constructor(params: {
    id: string;
    category: RequirementCategory;
    description: string;
    priority: RequirementPriority;
    confidence: ConfidenceScore | number;
    extractedFrom: string;
    entities?: Record<string, any>;
    createdAt?: Date;
  }) {
    this.id = params.id;
    this.category = params.category;
    this.description = params.description;
    this.priority = params.priority;
    this.confidence = params.confidence instanceof ConfidenceScore
      ? params.confidence
      : new ConfidenceScore(params.confidence);
    this.extractedFrom = params.extractedFrom;
    this.entities = params.entities;
    this.createdAt = params.createdAt || new Date();

    this.validate();
  }

  /**
   * Validate requirement invariants
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('Requirement ID is required');
    }

    if (!this.category) {
      throw new Error('Requirement category is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Requirement description is required');
    }

    if (!this.priority) {
      throw new Error('Requirement priority is required');
    }

    if (!this.extractedFrom) {
      throw new Error('Source message ID is required');
    }
  }

  /**
   * Get requirement ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get requirement category
   */
  getCategory(): RequirementCategory {
    return this.category;
  }

  /**
   * Get requirement description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get requirement priority
   */
  getPriority(): RequirementPriority {
    return this.priority;
  }

  /**
   * Get confidence score
   */
  getConfidence(): ConfidenceScore {
    return this.confidence;
  }

  /**
   * Get source message ID
   */
  getExtractedFrom(): string {
    return this.extractedFrom;
  }

  /**
   * Get extracted entities
   */
  getEntities(): Record<string, any> | undefined {
    return this.entities;
  }

  /**
   * Get creation timestamp
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Check if requirement is critical
   */
  isCritical(): boolean {
    return this.priority === RequirementPriority.CRITICAL;
  }

  /**
   * Check if requirement is high priority
   */
  isHighPriority(): boolean {
    return this.priority === RequirementPriority.HIGH || this.isCritical();
  }

  /**
   * Check if requirement is compliance related
   */
  isComplianceRelated(): boolean {
    return this.category === RequirementCategory.COMPLIANCE;
  }

  /**
   * Check if requirement is timeline related
   */
  isTimelineRelated(): boolean {
    return this.category === RequirementCategory.TIMELINE;
  }

  /**
   * Check if confidence is above threshold
   */
  hasHighConfidence(threshold: number = 0.7): boolean {
    return this.confidence.isAbove(threshold);
  }

  /**
   * Get priority weight for sorting
   */
  getPriorityWeight(): number {
    const weights: Record<RequirementPriority, number> = {
      [RequirementPriority.CRITICAL]: 4,
      [RequirementPriority.HIGH]: 3,
      [RequirementPriority.MEDIUM]: 2,
      [RequirementPriority.LOW]: 1,
    };
    return weights[this.priority];
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      category: this.category,
      description: this.description,
      priority: this.priority,
      confidence: this.confidence.getValue(),
      extractedFrom: this.extractedFrom,
      entities: this.entities,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: Record<string, any>): ProcessRequirement {
    return new ProcessRequirement({
      id: data.id,
      category: data.category,
      description: data.description,
      priority: data.priority,
      confidence: data.confidence,
      extractedFrom: data.extractedFrom,
      entities: data.entities,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    });
  }

  /**
   * Sort requirements by priority and confidence
   */
  static sortByImportance(requirements: ProcessRequirement[]): ProcessRequirement[] {
    return [...requirements].sort((a, b) => {
      // First sort by priority
      const priorityDiff = b.getPriorityWeight() - a.getPriorityWeight();
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      return b.getConfidence().getValue() - a.getConfidence().getValue();
    });
  }

  /**
   * Group requirements by category
   */
  static groupByCategory(requirements: ProcessRequirement[]): Map<RequirementCategory, ProcessRequirement[]> {
    const grouped = new Map<RequirementCategory, ProcessRequirement[]>();

    for (const req of requirements) {
      const category = req.getCategory();
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(req);
    }

    return grouped;
  }
}