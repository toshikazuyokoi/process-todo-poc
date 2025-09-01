import { apiClient } from '@/app/lib/api-client'
import { 
  AISession,
  AIMessage,
  GeneratedTemplate,
  SessionContext,
  SessionStatus
} from '../types'

// Research Result type definition (not in types.ts yet)
export interface ResearchResult {
  id: string;
  title: string;
  description: string;
  source: string;
  type: 'best_practice' | 'template' | 'compliance' | 'benchmark';
  relevance: number;
  summary?: string;
  url?: string;
}

// Session creation parameters
export interface CreateSessionParams {
  industry: string;
  processType: string;
  goal: string;
  additionalContext?: Record<string, any>;
}

// API response types
export interface SessionResponse {
  sessionId: string;
  status: SessionStatus;
  context: SessionContext;
  conversation: AIMessage[];
  requirements: any[];
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MessageResponse {
  sessionId: string;
  userMessage: AIMessage;
  aiResponse: AIMessage;
  extractedRequirements?: any[];
  conversationProgress?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export const aiAgentApi = {
  // Session management
  createSession: async (params: CreateSessionParams): Promise<SessionResponse> => {
    const response = await apiClient.post('/api/ai-agent/sessions', params)
    return response.data
  },

  getSession: async (sessionId: string): Promise<SessionResponse> => {
    const response = await apiClient.get(`/api/ai-agent/sessions/${sessionId}`)
    return response.data
  },

  endSession: async (sessionId: string): Promise<void> => {
    // Using DELETE method as per actual API
    await apiClient.delete(`/api/ai-agent/sessions/${sessionId}`)
  },

  // Messages
  sendMessage: async (sessionId: string, message: string): Promise<MessageResponse> => {
    const response = await apiClient.post(
      `/api/ai-agent/sessions/${sessionId}/messages`,
      { message }
    )
    return response.data
  },

  getMessages: async (sessionId: string): Promise<AIMessage[]> => {
    const response = await apiClient.get(
      `/api/ai-agent/sessions/${sessionId}/messages`
    )
    return response.data.messages || response.data
  },

  // Template generation
  generateTemplate: async (sessionId: string): Promise<GeneratedTemplate> => {
    const response = await apiClient.post(
      `/api/ai-agent/sessions/${sessionId}/generate-template`
    )
    return response.data
  },

  finalizeTemplate: async (
    sessionId: string, 
    templateId: string,
    modifications?: any
  ): Promise<void> => {
    await apiClient.post(
      `/api/ai-agent/sessions/${sessionId}/finalize-template`,
      {
        templateId,
        modifications
      }
    )
  },

  // Research
  searchBestPractices: async (query: string, filters?: any): Promise<ResearchResult[]> => {
    const response = await apiClient.post('/api/ai-agent/knowledge/best-practices/search', {
      query,
      filters
    })
    return response.data.results || response.data
  },

  searchCompliance: async (query: string, filters?: any): Promise<ResearchResult[]> => {
    const response = await apiClient.get('/api/ai-agent/research/compliance', {
      params: { query, filters }
    })
    return response.data.results || response.data
  },

  searchBenchmarks: async (query: string, filters?: any): Promise<ResearchResult[]> => {
    const response = await apiClient.get('/api/ai-agent/research/benchmarks', {
      params: { query, filters }
    })
    return response.data.results || response.data
  },

  // Feedback
  submitFeedback: async (sessionId: string, feedback: {
    type: string;
    category?: string;
    rating?: number;
    message?: string;
    metadata?: any;
  }): Promise<void> => {
    await apiClient.post('/api/ai-agent/knowledge/feedback', {
      sessionId,
      ...feedback
    })
  }
}