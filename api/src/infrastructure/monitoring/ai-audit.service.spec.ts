import { AIAuditService } from './ai-audit.service';
import { ConfigService } from '@nestjs/config';

describe('AIAuditService', () => {
  it('returns null when SALT is absent', () => {
    const cfg = { get: jest.fn().mockReturnValue(undefined) } as any as ConfigService;
    const svc = new AIAuditService(cfg);
    const out = svc.computeConversationHash([{ role: 'user', content: 'hello' }]);
    expect(out).toBeNull();
  });

  it('computes stable sha256 hex when SALT is present with normalization', () => {
    const cfg = { get: jest.fn().mockReturnValue('SALT') } as any as ConfigService;
    const svc = new AIAuditService(cfg);
    const msgs = [
      { role: 'user', content: ' hello\nworld  ' },
      { role: 'assistant', content: 'x'.repeat(2000) }, // will be trimmed in normalization chain
    ];
    const out1 = svc.computeConversationHash(msgs);
    const out2 = svc.computeConversationHash(msgs);
    expect(out1).toMatch(/^[a-f0-9]{64}$/);
    expect(out1).toBe(out2);
  });
});

