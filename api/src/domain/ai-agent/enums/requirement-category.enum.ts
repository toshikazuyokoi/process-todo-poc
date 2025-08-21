/**
 * Requirement Category Enum
 * Categorizes different types of process requirements
 */
export enum RequirementCategory {
  GOAL = 'goal',
  CONSTRAINT = 'constraint',
  STAKEHOLDER = 'stakeholder',
  DELIVERABLE = 'deliverable',
  TIMELINE = 'timeline',
  QUALITY = 'quality',
  COMPLIANCE = 'compliance',
  RISK = 'risk',
}

/**
 * Type guard to check if a value is a valid RequirementCategory
 */
export function isRequirementCategory(value: any): value is RequirementCategory {
  return Object.values(RequirementCategory).includes(value);
}

/**
 * Priority levels for requirements
 */
export enum RequirementPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Type guard for RequirementPriority
 */
export function isRequirementPriority(value: any): value is RequirementPriority {
  return Object.values(RequirementPriority).includes(value);
}