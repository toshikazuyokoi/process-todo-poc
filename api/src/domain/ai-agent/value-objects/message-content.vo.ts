/**
 * Message Content Value Object
 * Encapsulates and validates message content
 */
export class MessageContent {
  private readonly value: string;
  private readonly MAX_LENGTH = 10000;
  private readonly MIN_LENGTH = 1;

  constructor(value: string) {
    this.validate(value);
    this.value = this.sanitize(value);
  }

  /**
   * Validate message content
   */
  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Message content must be a non-empty string');
    }

    const trimmed = value.trim();
    
    if (trimmed.length < this.MIN_LENGTH) {
      throw new Error(`Message content must be at least ${this.MIN_LENGTH} character`);
    }

    if (trimmed.length > this.MAX_LENGTH) {
      throw new Error(`Message content must not exceed ${this.MAX_LENGTH} characters`);
    }
  }

  /**
   * Sanitize message content
   */
  private sanitize(value: string): string {
    return value.trim();
  }

  /**
   * Get the raw value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Get content length
   */
  getLength(): number {
    return this.value.length;
  }

  /**
   * Get word count
   */
  getWordCount(): number {
    return this.value.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if content contains specific text
   */
  contains(text: string): boolean {
    return this.value.toLowerCase().includes(text.toLowerCase());
  }

  /**
   * Get truncated content
   */
  truncate(maxLength: number, suffix: string = '...'): string {
    if (this.value.length <= maxLength) {
      return this.value;
    }
    return this.value.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Check equality
   */
  equals(other: MessageContent): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  /**
   * Create from string
   */
  static from(value: string): MessageContent {
    return new MessageContent(value);
  }
}