import { HistoryAssembler } from './history-assembler.service';

class FakeMsg {
  constructor(private role: any, private content: any) {}
  getRole() { return this.role; }
  getContentText() { return typeof this.content === 'string' ? this.content : JSON.stringify(this.content); }
}

class FakeSession {
  constructor(private msgs: any[]) {}
  getConversation() { return this.msgs; }
}

describe('HistoryAssembler', () => {
  let assembler: HistoryAssembler;
  let repo: any;

  beforeEach(() => {
    repo = { findById: jest.fn() };
    // @ts-ignore private injection bypass for test
    assembler = new HistoryAssembler(repo);
  });

  it('returns empty when session not found', async () => {
    repo.findById.mockResolvedValue(null);
    const res = await assembler.build('sid', { windowSize: 5 });
    expect(res).toEqual([]);
  });

  it('filters to user/assistant and slices last N, injects system when provided', async () => {
    const msgs = [
      new FakeMsg('system', 'ignore'),
      new FakeMsg('user', 'u1'),
      new FakeMsg('assistant', 'a1'),
      new FakeMsg('user', 'u2'),
      new FakeMsg('assistant', 'a2'),
    ];
    repo.findById.mockResolvedValue(new FakeSession(msgs));
    const res = await assembler.build('sid', { windowSize: 3, systemPrompt: 'SYS' });
    expect(res[0]).toEqual({ role: 'system', content: 'SYS' });
    // last 3 of user/assistant: u1,a1,u2,a2 -> slice keeps last 3 items => a1,u2,a2
    expect(res.slice(1)).toEqual([
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
    ]);
  });

  it('trims by token budget keeping system and last pair', async () => {
    const long = 'x'.repeat(5000);
    const msgs = [
      new FakeMsg('user', long),
      new FakeMsg('assistant', long),
      new FakeMsg('user', 'recent user'),
      new FakeMsg('assistant', 'recent assistant'),
    ];
    repo.findById.mockResolvedValue(new FakeSession(msgs));
    const res = await assembler.build('sid', { windowSize: 10, systemPrompt: 'SYS', maxTokensBudget: 50 });
    // Should keep system and last pair at minimum
    expect(res[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(res.slice(-2)).toEqual([
      { role: 'user', content: 'recent user' },
      { role: 'assistant', content: 'recent assistant' },
    ]);
  });

  it('ensures at least last user message if messages < 2', async () => {
    const msgs = [ new FakeMsg('user', 'only') ];
    repo.findById.mockResolvedValue(new FakeSession(msgs));
    const res = await assembler.build('sid', { windowSize: 10 });
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[res.length - 1]).toEqual({ role: 'user', content: 'only' });
  });
});

