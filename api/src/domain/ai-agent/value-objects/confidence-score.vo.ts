/**
 * Confidence Score Value Object
 * Represents a confidence score between 0 and 1
 */
export class ConfidenceScore {
  private readonly value: number;
  private readonly MIN_VALUE = 0;
  private readonly MAX_VALUE = 1;

  constructor(value: number) {
    this.validate(value);
    this.value = this.normalize(value);
  }

  /**
   * Validate confidence score
   */
  private validate(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Confidence score must be a valid number');
    }

    if (value < this.MIN_VALUE || value > this.MAX_VALUE) {
      throw new Error(`Confidence score must be between ${this.MIN_VALUE} and ${this.MAX_VALUE}`);
    }
  }

  /**
   * Normalize the value to ensure precision
   */
  private normalize(value: number): number {
    return Math.round(value * 1000) / 1000; // 3 decimal places
  }

  /**
   * Get the raw value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Get value as percentage
   */
  toPercentage(): number {
    return Math.round(this.value * 100);
  }

  /**
   * Get percentage string
   */
  toPercentageString(): string {
    return `${this.toPercentage()}%`;
  }

  /**
   * Get confidence level category
   */
  getLevel(): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' {
    if (this.value >= 0.9) return 'very_high';
    if (this.value >= 0.75) return 'high';
    if (this.value >= 0.5) return 'medium';
    if (this.value >= 0.25) return 'low';
    return 'very_low';
  }

  /**
   * Check if score is above threshold
   */
  isAbove(threshold: number): boolean {
    return this.value > threshold;
  }

  /**
   * Check if score is below threshold
   */
  isBelow(threshold: number): boolean {
    return this.value < threshold;
  }

  /**
   * Add two confidence scores (capped at 1)
   */
  add(other: ConfidenceScore): ConfidenceScore {
    return new ConfidenceScore(Math.min(this.value + other.value, this.MAX_VALUE));
  }

  /**
   * Multiply confidence scores
   */
  multiply(other: ConfidenceScore): ConfidenceScore {
    return new ConfidenceScore(this.value * other.value);
  }

  /**
   * Average multiple confidence scores
   */
  static average(scores: ConfidenceScore[]): ConfidenceScore {
    if (!scores || scores.length === 0) {
      throw new Error('Cannot calculate average of empty scores');
    }
    const sum = scores.reduce((acc, score) => acc + score.getValue(), 0);
    return new ConfidenceScore(sum / scores.length);
  }

  /**
   * Get weighted average
   */
  static weightedAverage(scores: Array<{ score: ConfidenceScore; weight: number }>): ConfidenceScore {
    if (!scores || scores.length === 0) {
      throw new Error('Cannot calculate weighted average of empty scores');
    }

    const totalWeight = scores.reduce((acc, item) => acc + item.weight, 0);
    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero');
    }

    const weightedSum = scores.reduce(
      (acc, item) => acc + item.score.getValue() * item.weight,
      0
    );

    return new ConfidenceScore(weightedSum / totalWeight);
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.value.toFixed(3);
  }

  /**
   * Check equality
   */
  equals(other: ConfidenceScore): boolean {
    if (!other) return false;
    return Math.abs(this.value - other.value) < 0.001; // Account for floating point precision
  }

  /**
   * Create from number
   */
  static from(value: number): ConfidenceScore {
    return new ConfidenceScore(value);
  }

  /**
   * Create from percentage
   */
  static fromPercentage(percentage: number): ConfidenceScore {
    return new ConfidenceScore(percentage / 100);
  }
}