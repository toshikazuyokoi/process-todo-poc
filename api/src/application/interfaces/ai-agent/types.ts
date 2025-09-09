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

export enum AiChatSchemaId {
  ProcessTemplateV1 = 'ai_chat_process_template.v1',
}

export interface StepTemplateDraft {
  seq: number;
  name: string;
  basis: 'goal' | 'prev';
  offsetDays: number;
  requiredArtifacts?: Array<{ kind: string; description?: string }>;
  dependsOn?: number[];
}

export interface AiChatProcessTemplateJson {
  schema: AiChatSchemaId;
  answer: string;
  missing_information?: string[];
  process_template_draft?: {
    name?: string;
    stepTemplates: StepTemplateDraft[];
  };
}

export interface TemplateDraftParseResult {
  ok: boolean;
  schema?: AiChatSchemaId;
  data?: AiChatProcessTemplateJson;
  errors?: string[];
}

