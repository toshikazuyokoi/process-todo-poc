import { Injectable, Inject } from '@nestjs/common';
import { InterviewSessionRepository } from '../../../domain/ai-agent/repositories/interview-session.repository.interface';
import { ChatMessage } from '../../interfaces/ai-agent/types';

@Injectable()
export class HistoryAssembler {
  constructor(
    @Inject('InterviewSessionRepository')
    private readonly sessionRepository: InterviewSessionRepository,
  ) {}

  async build(
    sessionId: string,
    options: { windowSize: number; maxTokensBudget?: number; systemPrompt?: string },
  ): Promise<ChatMessage[]> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) return [];

    const history = session.getConversation();

    // 直近N件（user/assistantのみ）
    const ua = history.filter((m) => {
      const role = (m as any).getRole?.();
      return role === 'user' || role === 'assistant' || role?.toString?.().toLowerCase() === 'user' || role?.toString?.().toLowerCase() === 'assistant';
    });

    const sliced = ua.slice(Math.max(0, ua.length - options.windowSize));

    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const m of sliced) {
      const role = (m as any).getRole?.();
      const roleStr = role && typeof role === 'string' ? (role as 'user'|'assistant') : ((role?.toString?.().toLowerCase?.() as any) ?? 'user');
      const content = (m as any).getContentText?.() ?? (m as any).getContent?.() ?? '';
      messages.push({ role: roleStr === 'assistant' ? 'assistant' : 'user', content: String(content) });
    }

    // トークン予算対応（簡易: utf8/4 換算で予算超過時は先頭から削除）
    if (options.maxTokensBudget && options.maxTokensBudget > 0) {
      const estTokens = (s: string) => Math.ceil(new TextEncoder().encode(s).length / 4);
      let total = messages.reduce((acc, m) => acc + estTokens(m.content), 0);
      while (total > options.maxTokensBudget && messages.length > 2) {
        const removed = messages.splice(messages[0].role === 'system' ? 1 : 0, 1);
        total -= estTokens(removed[0].content);
      }
    }

    // 最低限の直近ペア確保
    if (messages.length < 2 && ua.length > 0) {
      messages.push({ role: 'user', content: (ua[ua.length - 1] as any).getContentText?.() ?? '' });
    }

    return messages;
  }
}

