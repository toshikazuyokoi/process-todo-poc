import { OpenAIResponder } from './openai-responder.service';
import { PromptBuilder } from './prompt-builder.service';
import { HistoryAssembler } from './history-assembler.service';
import { AIConfigService } from '../../../infrastructure/ai/ai-config.service';
import { OpenAIService } from '../../../infrastructure/ai/openai.service';

const session = {
  sessionId: 'sid',
  context: { industry: 'Manufacturing', processType: 'Onboarding' },
} as any;

describe('OpenAIResponder', () => {
  let responder: OpenAIResponder;
  let prompt: jest.Mocked<PromptBuilder>;
  let history: jest.Mocked<HistoryAssembler>;
  let cfg: jest.Mocked<AIConfigService>;
  let openai: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    prompt = { buildSystemPrompt: jest.fn().mockReturnValue('SYS') } as any;
    history = { build: jest.fn().mockResolvedValue([{ role: 'user', content: 'u1' }]) } as any;
    cfg = { getMaxTokens: jest.fn().mockReturnValue(256) } as any;
    openai = {
      generateResponse: jest.fn().mockResolvedValue({
        content: 'ok',
        confidence: 0.9,
        metadata: { tokensUsed: 123 },
      } as any),
    } as any;

    responder = new OpenAIResponder(prompt, history, cfg, openai);
  });

  it('builds system and history, passes override and previous, maps tokens', async () => {
    const result = await responder.processMessage(session, 'Hi');

    expect(prompt.buildSystemPrompt).toHaveBeenCalledWith(session.context);
    expect(history.build).toHaveBeenCalledWith('sid', expect.objectContaining({
      windowSize: expect.any(Number),
      maxTokensBudget: expect.any(Number),
      systemPrompt: 'SYS',
    }));

    expect(openai.generateResponse).toHaveBeenCalledWith('Hi', expect.objectContaining({
      previousMessages: [{ role: 'user', content: 'u1' }],
    }), 'SYS');

    expect(result.response).toBe('ok');
    expect(result.tokenCount).toBe(123);
  });
});

