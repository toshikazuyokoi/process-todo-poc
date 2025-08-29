/**
 * Validation Constants
 * Based on ai_agent_enums_types.md
 */
export const VALIDATION_CONSTANTS = {
  MIN_CONFIDENCE_SCORE: 0.1,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.5,
  MAX_REQUIREMENTS_PER_SESSION: 100,
  MAX_STEPS_PER_TEMPLATE: 50,
} as const;

export type ValidationConstants = typeof VALIDATION_CONSTANTS;