import { MessageRole } from '../../domain/ai-agent/enums/message-role.enum';
import { BaseEvent, BaseErrorEvent } from './base.event';
import { MESSAGE_EVENTS } from './event-names';

/**
 * Message Received Event
 * Emitted when AI sends a response message
 */
export interface AIMessageReceivedEvent extends BaseEvent {
  messageId: string;
  content: string;
  role: MessageRole;
  suggestedQuestions?: string[];
  confidence?: number;
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
  };
}

/**
 * Message Typing Event
 * Emitted to show AI is processing
 */
export interface AIMessageTypingEvent extends BaseEvent {
  isTyping: boolean;
  estimatedTime?: number; // seconds
  stage?: 'thinking' | 'researching' | 'analyzing' | 'generating';
}

/**
 * Message Error Event
 * Emitted when message processing fails
 */
export interface AIMessageErrorEvent extends BaseErrorEvent {
  messageId?: string;
  userMessage?: string;
  retryable: boolean;
}

/**
 * Requirements Extracted Event
 * Emitted when requirements are extracted from conversation
 */
export interface AIRequirementsExtractedEvent extends BaseEvent {
  requirements: Array<{
    id: string;
    category: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
    extractedFrom?: string[]; // messageIds
  }>;
  totalCount: number;
  newCount: number; // newly extracted in this update
  updatedCount: number; // existing requirements that were updated
}

/**
 * Send Message Request (Client to Server)
 */
export interface SendMessageRequest {
  sessionId: string;
  message: string;
  metadata?: {
    clientId?: string;
    timestamp?: string;
  };
}

/**
 * Typing Indicator Request (Client to Server)
 */
export interface TypingIndicatorRequest {
  sessionId: string;
  isTyping: boolean;
}

/**
 * Type guards
 */
export function isMessageReceivedEvent(event: any): event is AIMessageReceivedEvent {
  return event && typeof event.sessionId === 'string' && typeof event.messageId === 'string' && event.content;
}

export function isMessageTypingEvent(event: any): event is AIMessageTypingEvent {
  return event && typeof event.sessionId === 'string' && typeof event.isTyping === 'boolean';
}

export function isMessageErrorEvent(event: any): event is AIMessageErrorEvent {
  return event && typeof event.sessionId === 'string' && event.error && typeof event.retryable === 'boolean';
}

export function isRequirementsExtractedEvent(event: any): event is AIRequirementsExtractedEvent {
  return event && typeof event.sessionId === 'string' && Array.isArray(event.requirements);
}

/**
 * Event name type mapping
 */
export type MessageEventMap = {
  [MESSAGE_EVENTS.RECEIVED]: AIMessageReceivedEvent;
  [MESSAGE_EVENTS.TYPING]: AIMessageTypingEvent;
  [MESSAGE_EVENTS.ERROR]: AIMessageErrorEvent;
  [MESSAGE_EVENTS.REQUIREMENTS_EXTRACTED]: AIRequirementsExtractedEvent;
  [MESSAGE_EVENTS.SEND]: SendMessageRequest;
  [MESSAGE_EVENTS.TYPING_INDICATOR]: TypingIndicatorRequest;
};