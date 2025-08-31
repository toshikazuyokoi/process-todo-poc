/**
 * AI Agent Hooks
 * Barrel export for all AI Agent custom hooks
 */

export { useAIWebSocket } from './use-websocket';
export { useSessionManagement } from './use-session-management';
export { useAIChat } from './use-ai-chat';
export { useTemplateGeneration } from './use-template-generation';

// Re-export types for convenience
export type {
  AISession,
  SessionContext,
  AIMessage,
  GeneratedTemplate,
  TemplateStep,
} from '../types';

export {
  SessionStatus,
  MessageRole,
  TemplateGenerationStage,
  RequirementCategory,
  Priority,
  ComplexityLevel,
  SESSION_EVENTS,
  MESSAGE_EVENTS,
  TEMPLATE_EVENTS,
  AI_EVENT_NAMES,
} from '../types';