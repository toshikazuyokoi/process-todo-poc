export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}