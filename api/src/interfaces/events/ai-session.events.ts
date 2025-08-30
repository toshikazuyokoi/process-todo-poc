import { SessionStatus } from '../../domain/ai-agent/enums/session-status.enum';
import { BaseEvent, BaseUserEvent } from './base.event';
import { SESSION_EVENTS } from './event-names';

/**
 * Session Created Event
 * Emitted when a new AI session is created
 */
export interface AISessionCreatedEvent extends BaseUserEvent {
  context: {
    industry?: string;
    processType?: string;
    goal?: string;
    complexity?: 'simple' | 'medium' | 'complex' | 'very_complex';
    teamSize?: number;
    duration?: string;
    compliance?: string[];
    region?: string;
    budget?: number;
    timeline?: string;
    additionalContext?: any;
  };
  welcomeMessage?: string;
}

/**
 * Session Status Changed Event
 * Emitted when session status changes
 */
export interface AISessionStatusChangedEvent extends BaseEvent {
  oldStatus: SessionStatus;
  newStatus: SessionStatus;
  reason?: string;
  changedBy?: number; // userId
}

/**
 * Session Ended Event
 * Emitted when session ends
 */
export interface AISessionEndedEvent extends BaseEvent {
  reason: 'completed' | 'cancelled' | 'expired' | 'error';
  summary?: {
    messagesCount: number;
    requirementsExtracted: number;
    templateGenerated: boolean;
    duration: number; // milliseconds
  };
  endedBy?: number; // userId
}

/**
 * Session Expired Event
 * Emitted when session expires due to inactivity
 */
export interface AISessionExpiredEvent extends BaseEvent {
  lastActivityAt: Date;
  expirationReason: 'inactivity' | 'timeout' | 'limit_exceeded';
}

/**
 * Join Session Request (Client to Server)
 */
export interface JoinSessionRequest {
  sessionId: string;
}

/**
 * Leave Session Request (Client to Server)
 */
export interface LeaveSessionRequest {
  sessionId: string;
}

/**
 * Session Status Request (Client to Server)
 */
export interface SessionStatusRequest {
  sessionId: string;
}

/**
 * Type guards
 */
export function isSessionCreatedEvent(event: any): event is AISessionCreatedEvent {
  return event && typeof event.sessionId === 'string' && typeof event.userId === 'number' && event.context;
}

export function isSessionStatusChangedEvent(event: any): event is AISessionStatusChangedEvent {
  return event && typeof event.sessionId === 'string' && event.oldStatus && event.newStatus;
}

export function isSessionEndedEvent(event: any): event is AISessionEndedEvent {
  return event && typeof event.sessionId === 'string' && event.reason;
}

/**
 * Event name type mapping
 */
export type SessionEventMap = {
  [SESSION_EVENTS.CREATED]: AISessionCreatedEvent;
  [SESSION_EVENTS.STATUS_CHANGED]: AISessionStatusChangedEvent;
  [SESSION_EVENTS.ENDED]: AISessionEndedEvent;
  [SESSION_EVENTS.EXPIRED]: AISessionExpiredEvent;
  [SESSION_EVENTS.JOIN]: JoinSessionRequest;
  [SESSION_EVENTS.LEAVE]: LeaveSessionRequest;
  [SESSION_EVENTS.STATUS_REQUEST]: SessionStatusRequest;
};