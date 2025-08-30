/**
 * Base Event Interface
 * Common structure for all AI WebSocket events
 */
export interface BaseEvent {
  sessionId: string;
  timestamp: Date;
}

/**
 * Base Event with User Context
 */
export interface BaseUserEvent extends BaseEvent {
  userId: number;
}

/**
 * Base Event with Error Information
 */
export interface BaseErrorEvent extends BaseEvent {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Event Direction
 */
export enum EventDirection {
  SERVER_TO_CLIENT = 'server_to_client',
  CLIENT_TO_SERVER = 'client_to_server',
  BIDIRECTIONAL = 'bidirectional',
}