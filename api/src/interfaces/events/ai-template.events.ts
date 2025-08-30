import { BaseEvent, BaseErrorEvent } from './base.event';
import { TEMPLATE_EVENTS } from './event-names';

/**
 * Template Generation Stages
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
 * Template Generation Started Event
 */
export interface AITemplateStartedEvent extends BaseEvent {
  estimatedTime?: number; // seconds
  requirements: {
    count: number;
    categories: string[];
  };
}

/**
 * Template Generation Progress Event
 */
export interface AITemplateProgressEvent extends BaseEvent {
  stage: TemplateGenerationStage;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
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
    estimatedDuration: number; // days
    confidence: number; // 0-1
    highlights: string[];
  };
}

/**
 * Template Generation Completed Event
 */
export interface AITemplateCompletedEvent extends BaseEvent {
  templateId: string;
  template: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      name: string;
      description: string;
      duration: number; // days
      dependencies: string[];
      artifacts?: string[];
    }>;
    metadata: {
      generatedAt: Date;
      generationTime: number; // milliseconds
      confidence: number;
      sources: string[];
    };
  };
  statistics: {
    stepsGenerated: number;
    researchSourcesUsed: number;
    requirementsIncorporated: number;
    estimatedProjectDuration: number; // days
  };
}

/**
 * Template Generation Failed Event
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
  processingTime: number; // milliseconds
}

/**
 * Generate Template Request (Client to Server)
 */
export interface GenerateTemplateRequest {
  sessionId: string;
  options?: {
    includeResearch?: boolean;
    maxSteps?: number;
    targetDuration?: number; // days
  };
}

/**
 * Cancel Template Generation Request (Client to Server)
 */
export interface CancelTemplateGenerationRequest {
  sessionId: string;
  reason?: string;
}

/**
 * Approve Template Request (Client to Server)
 */
export interface ApproveTemplateRequest {
  sessionId: string;
  templateId: string;
  modifications?: any;
}

/**
 * Type guards
 */
export function isTemplateStartedEvent(event: any): event is AITemplateStartedEvent {
  return event && typeof event.sessionId === 'string' && event.requirements;
}

export function isTemplateProgressEvent(event: any): event is AITemplateProgressEvent {
  return event && typeof event.sessionId === 'string' && event.stage && typeof event.progress === 'number';
}

export function isTemplatePreviewEvent(event: any): event is AITemplatePreviewEvent {
  return event && typeof event.sessionId === 'string' && event.templateId && event.preview;
}

export function isTemplateCompletedEvent(event: any): event is AITemplateCompletedEvent {
  return event && typeof event.sessionId === 'string' && event.templateId && event.template;
}

export function isTemplateFailedEvent(event: any): event is AITemplateFailedEvent {
  return event && typeof event.sessionId === 'string' && event.error && event.stage;
}

/**
 * Event name type mapping
 */
export type TemplateEventMap = {
  [TEMPLATE_EVENTS.STARTED]: AITemplateStartedEvent;
  [TEMPLATE_EVENTS.PROGRESS]: AITemplateProgressEvent;
  [TEMPLATE_EVENTS.PREVIEW]: AITemplatePreviewEvent;
  [TEMPLATE_EVENTS.COMPLETED]: AITemplateCompletedEvent;
  [TEMPLATE_EVENTS.FAILED]: AITemplateFailedEvent;
  [TEMPLATE_EVENTS.RESEARCH_COMPLETE]: AIResearchCompleteEvent;
  [TEMPLATE_EVENTS.GENERATE]: GenerateTemplateRequest;
  [TEMPLATE_EVENTS.CANCEL]: CancelTemplateGenerationRequest;
  [TEMPLATE_EVENTS.APPROVE]: ApproveTemplateRequest;
};