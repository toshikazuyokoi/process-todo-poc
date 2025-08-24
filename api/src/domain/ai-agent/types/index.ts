export interface ConversationMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  suggestedQuestions?: string[];
  confidence?: number;
  tokenCount?: number;
  estimatedCost?: number;
  error?: boolean;
}

export interface ProcessRequirement {
  id?: string;
  category: string;
  description: string;
  priority?: string;
  confidence: number;
  source?: string;
  extractedAt?: Date;
}

// Import from entity for consistency
export { SessionContext } from '../entities/interview-session.entity';

export interface ConversationSession {
  sessionId: string;
  context: any;
  conversation: ConversationMessageDto[];
  suggestedQuestions?: string[];
}

export interface ConversationProgress {
  completeness: number;
  missingAreas?: string[];
}