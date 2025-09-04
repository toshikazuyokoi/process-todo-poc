import { Injectable } from '@nestjs/common';

@Injectable()
export class LLMOutputParser {
  extractTemplateJson(content: string): { ok: boolean; errors?: string[]; data?: any } {
    // Stub implementation per PR1 (no logic yet)
    return { ok: false };
  }
}

