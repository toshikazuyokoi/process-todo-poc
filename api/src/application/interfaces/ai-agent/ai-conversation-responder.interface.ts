export interface ConversationSessionInput {
  sessionId: string;
  context: Record<string, any>;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}

export interface ConversationProcessResult {
  response: string;
  requirementsExtracted: boolean;
  extractedRequirements?: any[];
}

export interface AIConversationResponder {
  processMessage(
    session: ConversationSessionInput,
    message: string,
  ): Promise<ConversationProcessResult>;
}

export const AI_CONVERSATION_RESPONDER = 'AI_CONVERSATION_RESPONDER';

