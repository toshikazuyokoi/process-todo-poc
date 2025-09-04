export interface SessionContextDto {
  industry?: string;
  processType?: string;
  goal?: string;
  region?: string;
  compliance?: string;
  additionalContext?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UsageDto {
  tokens: number;
  costUsd?: number;
}

