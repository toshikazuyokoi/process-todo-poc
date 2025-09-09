import { LLMOutputParser } from './llm-output-parser.service';
import { AiChatSchemaId } from '../../interfaces/ai-agent/types';

const fence = (lang: string, body: string, crlf = false) => {
  const nl = crlf ? '\r\n' : '\n';
  return `\`\`\`${lang}${nl}${body}\`\`\``;
};

describe('LLMOutputParser', () => {
  let parser: LLMOutputParser;
  beforeEach(() => {
    parser = new LLMOutputParser();
  });

  it('returns MissingFence when no fence exists', () => {
    const res = parser.extractTemplateJson('hello world');
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('MissingFence');
  });

  it('returns NonJsonFence when fenced block is not an object', () => {
    const content = fence('json', '[1,2,3]');
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('NonJsonFence');
  });

  it('returns FenceTooLarge when fenced JSON exceeds 32KB', () => {
    const big = 'x'.repeat(33 * 1024);
    const content = fence('json', `{ "schema": "${AiChatSchemaId.ProcessTemplateV1}", "p": "${big}" }`);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('FenceTooLarge');
  });

  it('returns JsonParseError on malformed JSON (trailing comma)', () => {
    const content = fence('json', `{ "schema": "${AiChatSchemaId.ProcessTemplateV1}", }`);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('JsonParseError');
  });

  it('returns SchemaMismatch when schema is not expected', () => {
    const content = fence('json', `{ "schema": "wrong", "answer": "a" }`);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('SchemaMismatch');
  });

  it('fails when seq is not continuous', () => {
    const body = JSON.stringify({
      schema: AiChatSchemaId.ProcessTemplateV1,
      answer: 'ok',
      process_template_draft: {
        name: 'n',
        stepTemplates: [
          { seq: 1, name: 's1', basis: 'goal', offsetDays: 0 },
          { seq: 3, name: 's3', basis: 'prev', offsetDays: 1 },
        ],
      },
    });
    const content = fence('json', body);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('ValidationFailed:SeqNotContinuous');
  });

  it('fails when first step basis is not goal', () => {
    const body = JSON.stringify({
      schema: AiChatSchemaId.ProcessTemplateV1,
      answer: 'ok',
      process_template_draft: {
        stepTemplates: [
          { seq: 1, name: 's1', basis: 'prev', offsetDays: 0 },
        ],
      },
    });
    const content = fence('json', body);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('ValidationFailed:FirstBasisMustBeGoal');
  });

  it('fails when dependsOn references out of range or future', () => {
    const body = JSON.stringify({
      schema: AiChatSchemaId.ProcessTemplateV1,
      answer: 'ok',
      process_template_draft: {
        stepTemplates: [
          { seq: 1, name: 's1', basis: 'goal', offsetDays: 0 },
          { seq: 2, name: 's2', basis: 'prev', offsetDays: 1, dependsOn: [99] },
        ],
      },
    });
    const content = fence('json', body);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('ValidationFailed:DependsOnOutOfRange');

    const body2 = JSON.stringify({
      schema: AiChatSchemaId.ProcessTemplateV1,
      answer: 'ok',
      process_template_draft: {
        stepTemplates: [
          { seq: 1, name: 's1', basis: 'goal', offsetDays: 0 },
          { seq: 2, name: 's2', basis: 'prev', offsetDays: 1, dependsOn: [2] },
        ],
      },
    });
    const content2 = fence('json', body2);
    const res2 = parser.extractTemplateJson(content2);
    expect(res2.ok).toBe(false);
    expect(res2.errors).toContain('ValidationFailed:DependsOnFuture');
  });

  it('accepts valid minimal draft (empty steps)', () => {
    const body = JSON.stringify({
      schema: AiChatSchemaId.ProcessTemplateV1,
      answer: 'ok',
      process_template_draft: {
        name: 'draft',
        stepTemplates: [],
      },
    });
    const res = parser.extractTemplateJson(fence('json', body));
    expect(res.ok).toBe(true);
    expect(res.schema).toBe(AiChatSchemaId.ProcessTemplateV1);
    expect(res.data?.process_template_draft?.stepTemplates).toEqual([]);
  });

  it('accepts valid steps and returns data', () => {
    const body = JSON.stringify({
      schema: AiChatSchemaId.ProcessTemplateV1,
      answer: 'ok',
      process_template_draft: {
        stepTemplates: [
          { seq: 1, name: 's1', basis: 'goal', offsetDays: 0 },
          { seq: 2, name: 's2', basis: 'prev', offsetDays: 1, dependsOn: [1] },
        ],
      },
    });
    const res = parser.extractTemplateJson(fence('json', body));
    expect(res.ok).toBe(true);
    expect(res.data?.process_template_draft?.stepTemplates?.length).toBe(2);
  });

  it('prefers the last json fence when multiple fences exist', () => {
    const valid = JSON.stringify({ schema: AiChatSchemaId.ProcessTemplateV1, answer: 'ok' });
    const multi = fence('txt', 'not json object') + '\n' + fence('json', valid);
    const res = parser.extractTemplateJson(multi);
    expect(res.ok).toBe(true);
  });

  it('handles CRLF fence newlines', () => {
    const body = JSON.stringify({ schema: AiChatSchemaId.ProcessTemplateV1, answer: 'ok' });
    const content = fence('json', body, true);
    const res = parser.extractTemplateJson(content);
    expect(res.ok).toBe(true);
  });
});

