import { Injectable, Inject, Logger } from '@nestjs/common';
import { AIConversationResponder, ConversationSessionInput, ConversationProcessResult } from '../../interfaces/ai-agent/ai-conversation-responder.interface';
import { PromptBuilder } from './prompt-builder.service';
import { HistoryAssembler } from './history-assembler.service';
import { AIConfigService } from '../../../infrastructure/ai/ai-config.service';
import { OpenAIService } from '../../../infrastructure/ai/openai.service';

@Injectable()
export class OpenAIResponder implements AIConversationResponder {
  private readonly logger = new Logger(OpenAIResponder.name);

  constructor(
    private readonly promptBuilder: PromptBuilder,
    private readonly historyAssembler: HistoryAssembler,
    private readonly aiConfig: AIConfigService,
    private readonly openAI: OpenAIService,
  ) {}

  async processMessage(session: ConversationSessionInput, message: string): Promise<ConversationProcessResult> {
    const systemPrompt = this.promptBuilder.buildSystemPrompt(session.context as any);

    const windowSize = 12; // could come from config later
    const maxTokensBudget = Math.max(200, this.aiConfig.getMaxTokens());

    const messages = await this.historyAssembler.build(session.sessionId, {
      windowSize,
      maxTokensBudget,
      systemPrompt,
    });

    // append current user message
    messages.push({ role: 'user', content: message });

    // Call OpenAI using override system prompt and previous messages
    const previous = messages.filter(m => m.role !== 'user' || m.content !== message).map(m => ({ role: m.role as 'user'|'assistant', content: m.content }));

    const ai = await this.openAI.generateResponse(message, {
      sessionId: session.sessionId,
      userId: 0,
      industry: (session.context as any)?.industry,
      processType: (session.context as any)?.processType,
      previousMessages: previous,
    }, systemPrompt);

    const tokenCount = ai.metadata?.tokensUsed ?? 0;

    return {
      response: ai.content,
      requirementsExtracted: false,
      extractedRequirements: [],
      tokenCount,
    };
  }
}

