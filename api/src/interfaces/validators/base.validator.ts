import { Logger } from '@nestjs/common';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

/**
 * Base Validator
 * 全てのValidatorの基底クラス
 * 将来の拡張ポイントとして共通機能を提供
 */
export abstract class BaseValidator<T = any> {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Validate input data
   * @param data - Data to validate
   * @returns ValidationResult
   */
  abstract validate(data: T): ValidationResult | Promise<ValidationResult>;

  /**
   * Check if value exceeds limit
   * @param value - Current value
   * @param limit - Maximum allowed value
   * @param fieldName - Field name for error message
   * @returns Error message if limit exceeded, undefined otherwise
   */
  protected checkLimit(value: number, limit: number, fieldName: string): string | undefined {
    if (value > limit) {
      return `${fieldName} exceeds maximum limit of ${limit}`;
    }
    return undefined;
  }

  /**
   * Check if value meets minimum requirement
   * @param value - Current value
   * @param minimum - Minimum required value
   * @param fieldName - Field name for error message
   * @returns Error message if below minimum, undefined otherwise
   */
  protected checkMinimum(value: number, minimum: number, fieldName: string): string | undefined {
    if (value < minimum) {
      return `${fieldName} is below minimum requirement of ${minimum}`;
    }
    return undefined;
  }

  /**
   * Combine multiple validation results
   * @param results - Array of validation results
   * @returns Combined validation result
   */
  protected combineResults(results: ValidationResult[]): ValidationResult {
    const errors = results
      .filter(r => !r.isValid)
      .flatMap(r => r.errors || []);

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}