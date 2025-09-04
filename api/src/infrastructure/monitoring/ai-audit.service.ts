import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class AIAuditService {
  constructor(private readonly config: ConfigService) {}

  computeConversationHash(messages: Array<{ role: string; content: string }>): string | null {
    const salt = this.config.get<string>('AI_AUDIT_SALT');
    if (!salt) return null;

    // Normalize: "role:content\n" concat, collapse whitespace, trim to 1000 chars
    const normalized = messages
      .map((m) => `${m.role}:${(m.content || '').toString()}`)
      .join('\n')
      .replace(/\s+/g, ' ')
      .slice(0, 1000);

    const h = createHash('sha256');
    h.update(salt + normalized);
    return h.digest('hex');
  }
}

