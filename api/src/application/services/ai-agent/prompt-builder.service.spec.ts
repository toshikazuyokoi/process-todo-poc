import { PromptBuilder } from './prompt-builder.service';

describe('PromptBuilder', () => {
  let builder: PromptBuilder;
  beforeEach(() => {
    builder = new PromptBuilder();
  });

  it('includes fixed Japanese requirements for empty context', () => {
    const out = builder.buildSystemPrompt({} as any);
    expect(out).toContain('日本語で簡潔');
    expect(out).toContain('[文脈]');
    expect(out).toContain('ポリシー:');
    expect(out).toContain('出力要件:');
    expect(out).toContain('ai_chat_process_template.v1');
    expect(out).toContain('コードフェンス');
  });

  it('embeds industry/processType/goal/region+compliance/additionalContext', () => {
    const out = builder.buildSystemPrompt({
      industry: 'Manufacturing',
      processType: 'Onboarding',
      goal: 'Reduce lead time',
      region: 'JP',
      compliance: ['PIPA', 'SOX'],
      additionalContext: 'Pilot project',
    } as any);

    expect(out).toContain('業界: Manufacturing');
    expect(out).toContain('プロセス種別: Onboarding');
    expect(out).toContain('ゴール: Reduce lead time');
    expect(out).toContain('地域/規制: JP/PIPA, SOX');
    expect(out).toContain('追加前提: Pilot project');
  });

  it('formats compliance string or undefined gracefully', () => {
    const s1 = builder.buildSystemPrompt({ region: 'US', compliance: 'GLBA' } as any);
    expect(s1).toContain('地域/規制: US/GLBA');
    const s2 = builder.buildSystemPrompt({ region: 'EU' } as any);
    expect(s2).toContain('地域/規制: EU/-');
  });
});

