import { Injectable } from '@nestjs/common';
import { SessionContextDto } from '../../interfaces/ai-agent/types';

@Injectable()
export class PromptBuilder {
  buildSystemPrompt(context: SessionContextDto): string {
    // Stub implementation per PR1 (no logic yet)
    return 'System prompt placeholder';
  }
}

