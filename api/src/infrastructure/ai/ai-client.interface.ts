/**
 * AI Client Interface
 * AIサービスの共通インターフェース定義
 */

export interface AIContext {
  sessionId: string;
  userId: number;
  industry?: string;
  processType?: string;
  previousMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  confidence: number;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    finishReason?: string;
    [key: string]: any;
  };
}

export interface TemplateContext {
  industry: string;
  processType: string;
  complexity: 'simple' | 'medium' | 'complex' | 'low' | 'high';
  constraints?: string[];
  preferences?: Record<string, any>;
}

export interface TemplateRecommendation {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    description: string;
    duration: number;
    dependencies: string[];
    requiredArtifacts?: string[];
  }>;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface Entity {
  type: 'requirement' | 'constraint' | 'goal' | 'stakeholder' | 'deadline' | 'artifact';
  value: string;
  confidence: number;
  context?: string;
}

export interface Intent {
  type: 'create_template' | 'modify_template' | 'ask_question' | 'provide_information' | 'clarify' | 'other';
  confidence: number;
  entities?: Entity[];
}

export interface AIClientInterface {
  generateResponse(prompt: string, context: AIContext): Promise<AIResponse>;
  generateTemplate(requirements: any[], context: TemplateContext): Promise<TemplateRecommendation>;
  extractEntities(text: string): Promise<Entity[]>;
  classifyIntent(message: string): Promise<Intent>;
  summarizeText(text: string, maxLength?: number): Promise<string>;
  validateResponse(response: string): Promise<boolean>;
  estimateTokens(text: string): number;
  checkRateLimit(userId: number): Promise<boolean>;
}