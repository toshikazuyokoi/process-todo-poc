import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/**
 * Session ID Value Object
 * Ensures session IDs are valid UUIDs and provides type safety
 */
export class SessionId {
  private readonly value: string;

  constructor(value?: string) {
    if (value) {
      if (!this.isValid(value)) {
        throw new Error(`Invalid session ID format: ${value}`);
      }
      this.value = value;
    } else {
      this.value = this.generate();
    }
  }

  /**
   * Generate a new session ID
   */
  private generate(): string {
    return uuidv4();
  }

  /**
   * Validate session ID format
   */
  private isValid(value: string): boolean {
    return uuidValidate(value);
  }

  /**
   * Get the raw value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Check equality with another SessionId
   */
  equals(other: SessionId): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  /**
   * Create from existing value
   */
  static from(value: string): SessionId {
    return new SessionId(value);
  }

  /**
   * Create new random SessionId
   */
  static create(): SessionId {
    return new SessionId();
  }
}