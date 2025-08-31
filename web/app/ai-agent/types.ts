/**
 * AI Agent Types and Interfaces
 * Frontend type definitions for AI Agent functionality
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Session Status
 */
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Message Role
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * Template Generation Stage
 */
export enum TemplateGenerationStage {
  INITIALIZING = 'initializing',
  RESEARCHING = 'researching',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  VALIDATING = 'validating',
  FINALIZING = 'finalizing',
}

/**
 * Requirement Category
 */
export enum RequirementCategory {
  GOAL = 'goal',
  CONSTRAINT = 'constraint',
  STAKEHOLDER = 'stakeholder',
  DELIVERABLE = 'deliverable',
  TIMELINE = 'timeline',
  QUALITY = 'quality',
  COMPLIANCE = 'compliance',
  RISK = 'risk',
}

/**
 * Priority Level
 */
export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  CRITICAL = 'critical',
}

/**
 * Complexity Level
 */
export enum ComplexityLevel {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex',
}

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base Event Interface
 */
export interface BaseEvent {
  sessionId: string;
  timestamp: Date | string;
}

/**
 * Base User Event Interface
 */
export interface BaseUserEvent extends BaseEvent {
  userId: number;
}

/**
 * Base Error Event Interface
 */
export interface BaseErrorEvent extends BaseEvent {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session Context
 */
export interface SessionContext {
  industry?: string;
  processType?: string;
  goal?: string;
  complexity?: ComplexityLevel;
  teamSize?: number;
  duration?: string;
  compliance?: string[];
  region?: string;
  budget?: number;
  timeline?: string;
  additionalContext?: any;
}

/**
 * AI Session
 */
export interface AISession {
  id: string;
  userId: number;
  status: SessionStatus;
  context: SessionContext;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActivityAt?: Date | string;
  expiresAt?: Date | string;
}

/**
 * Session Created Event
 */
export interface AISessionCreatedEvent extends BaseUserEvent {
  context: SessionContext;
  welcomeMessage?: string;
}

/**
 * Session Status Changed Event
 */
export interface AISessionStatusChangedEvent extends BaseEvent {
  oldStatus: SessionStatus;
  newStatus: SessionStatus;
  reason?: string;
  changedBy?: number;
}

/**
 * Session Ended Event
 */
export interface AISessionEndedEvent extends BaseEvent {
  reason: 'completed' | 'cancelled' | 'expired' | 'error';
  summary?: {
    messagesCount: number;
    requirementsExtracted: number;
    templateGenerated: boolean;
    duration: number;
  };
  endedBy?: number;
}

/**
 * Session Expired Event
 */
export interface AISessionExpiredEvent extends BaseEvent {
  lastActivityAt: Date | string;
  expirationReason: 'inactivity' | 'timeout' | 'limit_exceeded';
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * AI Message
 */
export interface AIMessage {
  id: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  createdAt: Date | string;
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
  };
}

/**
 * Message Received Event
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
 */
export interface AIMessageTypingEvent extends BaseEvent {
  isTyping: boolean;
  estimatedTime?: number;
  stage?: 'thinking' | 'researching' | 'analyzing' | 'generating';
}

/**
 * Message Error Event
 */
export interface AIMessageErrorEvent extends BaseErrorEvent {
  messageId?: string;
  userMessage?: string;
  retryable: boolean;
}

/**
 * Requirements Extracted Event
 */
export interface AIRequirementsExtractedEvent extends BaseEvent {
  requirements: Array<{
    id: string;
    category: RequirementCategory;
    content: string;
    priority: Priority;
    confidence: number;
    extractedFrom?: string[];
  }>;
  totalCount: number;
  newCount: number;
  updatedCount: number;
}

// ============================================================================
// Template Types
// ============================================================================

/**
 * Template Step
 */
export interface TemplateStep {
  id: string;
  name: string;
  description: string;
  duration: number;
  dependencies: string[];
  artifacts?: string[];
}

/**
 * Generated Template
 */
export interface GeneratedTemplate {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  steps: TemplateStep[];
  metadata: {
    generatedAt: Date | string;
    generationTime: number;
    confidence: number;
    sources: string[];
  };
}

/**
 * Template Started Event
 */
export interface AITemplateStartedEvent extends BaseEvent {
  estimatedTime?: number;
  requirements: {
    count: number;
    categories: string[];
  };
}

/**
 * Template Progress Event
 */
export interface AITemplateProgressEvent extends BaseEvent {
  stage: TemplateGenerationStage;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  details?: {
    stepsCompleted?: number;
    totalSteps?: number;
    currentStep?: string;
  };
}

/**
 * Template Preview Event
 */
export interface AITemplatePreviewEvent extends BaseEvent {
  templateId: string;
  preview: {
    title: string;
    description: string;
    stepCount: number;
    estimatedDuration: number;
    confidence: number;
    highlights: string[];
  };
}

/**
 * Template Completed Event
 */
export interface AITemplateCompletedEvent extends BaseEvent {
  templateId: string;
  template: GeneratedTemplate;
  statistics: {
    stepsGenerated: number;
    researchSourcesUsed: number;
    requirementsIncorporated: number;
    estimatedProjectDuration: number;
  };
}

/**
 * Template Failed Event
 */
export interface AITemplateFailedEvent extends BaseErrorEvent {
  stage: TemplateGenerationStage;
  canRetry: boolean;
  partialResult?: any;
}

/**
 * Research Complete Event
 */
export interface AIResearchCompleteEvent extends BaseEvent {
  results: Array<{
    source: string;
    type: 'best_practice' | 'template' | 'compliance' | 'benchmark';
    relevance: number;
    summary: string;
    url?: string;
  }>;
  totalResults: number;
  processingTime: number;
}

// ============================================================================
// Request Types (Client to Server)
// ============================================================================

/**
 * Join Session Request
 */
export interface JoinSessionRequest {
  sessionId: string;
}

/**
 * Leave Session Request
 */
export interface LeaveSessionRequest {
  sessionId: string;
}

/**
 * Session Status Request
 */
export interface SessionStatusRequest {
  sessionId: string;
}

/**
 * Send Message Request
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
 * Typing Indicator Request
 */
export interface TypingIndicatorRequest {
  sessionId: string;
  isTyping: boolean;
}

/**
 * Generate Template Request
 */
export interface GenerateTemplateRequest {
  sessionId: string;
  options?: {
    includeResearch?: boolean;
    maxSteps?: number;
    targetDuration?: number;
  };
}

/**
 * Cancel Template Generation Request
 */
export interface CancelTemplateGenerationRequest {
  sessionId: string;
  reason?: string;
}

/**
 * Approve Template Request
 */
export interface ApproveTemplateRequest {
  sessionId: string;
  templateId: string;
  modifications?: any;
}

// ============================================================================
// Event Names
// ============================================================================

export const SESSION_EVENTS = {
  CREATED: 'ai:session:created',
  STATUS_CHANGED: 'ai:session:status',
  ENDED: 'ai:session:ended',
  EXPIRED: 'ai:session:expired',
  JOIN: 'ai:session:join',
  LEAVE: 'ai:session:leave',
  STATUS_REQUEST: 'ai:session:status:request',
} as const;

export const MESSAGE_EVENTS = {
  RECEIVED: 'ai:message:received',
  TYPING: 'ai:message:typing',
  ERROR: 'ai:message:error',
  REQUIREMENTS_EXTRACTED: 'ai:requirements:extracted',
  SEND: 'ai:message:send',
  TYPING_INDICATOR: 'ai:message:typing:indicator',
} as const;

export const TEMPLATE_EVENTS = {
  STARTED: 'ai:template:started',
  PROGRESS: 'ai:template:progress',
  PREVIEW: 'ai:template:preview',
  COMPLETED: 'ai:template:completed',
  FAILED: 'ai:template:failed',
  RESEARCH_COMPLETE: 'ai:template:research:complete',
  GENERATE: 'ai:template:generate',
  CANCEL: 'ai:template:cancel',
  APPROVE: 'ai:template:approve',
} as const;

export const AI_EVENT_NAMES = {
  ...SESSION_EVENTS,
  ...MESSAGE_EVENTS,
  ...TEMPLATE_EVENTS,
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isSessionStatus(value: any): value is SessionStatus {
  return Object.values(SessionStatus).includes(value);
}

export function isMessageRole(value: any): value is MessageRole {
  return Object.values(MessageRole).includes(value);
}

export function isTemplateGenerationStage(value: any): value is TemplateGenerationStage {
  return Object.values(TemplateGenerationStage).includes(value);
}