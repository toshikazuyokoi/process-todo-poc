/**
 * AI WebSocket Events
 * Barrel export for all event types and utilities
 */

// Base events
export * from './base.event';

// Event names
export * from './event-names';

// Session events
export * from './ai-session.events';

// Message events
export * from './ai-message.events';

// Template events
export * from './ai-template.events';

// Combined type for all AI events
import { SessionEventMap } from './ai-session.events';
import { MessageEventMap } from './ai-message.events';
import { TemplateEventMap } from './ai-template.events';

export type AIEventMap = SessionEventMap & MessageEventMap & TemplateEventMap;

// Re-export commonly used types for convenience
export { SessionStatus } from '../../domain/ai-agent/enums/session-status.enum';
export { MessageRole } from '../../domain/ai-agent/enums/message-role.enum';