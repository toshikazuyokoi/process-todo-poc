/**
 * AI Agent WebSocket Event Names
 * Centralized event name constants for type safety
 */

// Session Events
export const SESSION_EVENTS = {
  // Server to Client
  CREATED: 'ai:session:created',
  STATUS_CHANGED: 'ai:session:status',
  ENDED: 'ai:session:ended',
  EXPIRED: 'ai:session:expired',
  
  // Client to Server
  JOIN: 'ai:session:join',
  LEAVE: 'ai:session:leave',
  STATUS_REQUEST: 'ai:session:status:request',
} as const;

// Message Events
export const MESSAGE_EVENTS = {
  // Server to Client
  RECEIVED: 'ai:message:received',
  TYPING: 'ai:message:typing',
  ERROR: 'ai:message:error',
  REQUIREMENTS_EXTRACTED: 'ai:requirements:extracted',
  
  // Client to Server
  SEND: 'ai:message:send',
  TYPING_INDICATOR: 'ai:message:typing:indicator',
} as const;

// Template Events
export const TEMPLATE_EVENTS = {
  // Server to Client
  STARTED: 'ai:template:started',
  PROGRESS: 'ai:template:progress',
  PREVIEW: 'ai:template:preview',
  COMPLETED: 'ai:template:completed',
  FAILED: 'ai:template:failed',
  RESEARCH_COMPLETE: 'ai:template:research:complete',
  
  // Client to Server
  GENERATE: 'ai:template:generate',
  CANCEL: 'ai:template:cancel',
  APPROVE: 'ai:template:approve',
} as const;

// Combined event names for type safety
export const AI_EVENT_NAMES = {
  ...SESSION_EVENTS,
  ...MESSAGE_EVENTS,
  ...TEMPLATE_EVENTS,
} as const;

// Type definitions
export type SessionEventName = typeof SESSION_EVENTS[keyof typeof SESSION_EVENTS];
export type MessageEventName = typeof MESSAGE_EVENTS[keyof typeof MESSAGE_EVENTS];
export type TemplateEventName = typeof TEMPLATE_EVENTS[keyof typeof TEMPLATE_EVENTS];
export type AIEventName = typeof AI_EVENT_NAMES[keyof typeof AI_EVENT_NAMES];

/**
 * Check if a string is a valid AI event name
 */
export function isAIEventName(value: string): value is AIEventName {
  return Object.values(AI_EVENT_NAMES).includes(value as AIEventName);
}