import { Injectable } from '@nestjs/common';
import { AiChatProcessTemplateJson, AiChatSchemaId, TemplateDraftParseResult } from '../../interfaces/ai-agent/types';

@Injectable()
export class LLMOutputParser {
  extractTemplateJson(content: string): TemplateDraftParseResult {
    if (!content) return { ok: false, errors: ['EmptyContent'] };

    // Find last fenced code block (support both LF and CRLF)
    const fenceRegex = /```(\w+)?\r?\n([\s\S]*?)```/g;
    let lastMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;
    while ((match = fenceRegex.exec(content)) !== null) {
      lastMatch = match;
    }
    if (!lastMatch) return { ok: false, errors: ['MissingFence'] };

    const lang = (lastMatch[1] || '').toLowerCase();
    const code = lastMatch[2].trim();

    // Prefer json-labeled fence; otherwise accept if looks like JSON object
    if (lang && lang !== 'json') {
      // Try to find a json fence specifically (support CRLF)
      const jsonFenceRegex = /```json\r?\n([\s\S]*?)```/g;
      let jsonMatch: RegExpExecArray | null = null;
      let m: RegExpExecArray | null;
      while ((m = jsonFenceRegex.exec(content)) !== null) {
        jsonMatch = m;
      }
      if (jsonMatch) {
        lastMatch = jsonMatch;
      }
    }

    const jsonCode = (lastMatch[2] || '').trim();

    if (jsonCode.length > 32 * 1024) return { ok: false, errors: ['FenceTooLarge'] };
    if (!(jsonCode.startsWith('{') && jsonCode.endsWith('}'))) return { ok: false, errors: ['NonJsonFence'] };

    let parsed: any;
    try {
      parsed = JSON.parse(jsonCode);
    } catch (e) {
      return { ok: false, errors: ['JsonParseError'] };
    }

    // Schema validation
    if (parsed.schema !== AiChatSchemaId.ProcessTemplateV1) {
      return { ok: false, errors: ['SchemaMismatch'] };
    }

    const data = parsed as AiChatProcessTemplateJson;

    // Validate stepTemplates if present
    const draft = data.process_template_draft;
    if (draft && Array.isArray(draft.stepTemplates)) {
      const steps = draft.stepTemplates;
      if (steps.length === 0) {
        // allow empty
      } else {
        // seq must be 1..N continuous
        const seqs = steps.map(s => s.seq).sort((a, b) => a - b);
        for (let i = 0; i < seqs.length; i++) {
          if (seqs[i] !== i + 1) {
            return { ok: false, errors: ['ValidationFailed:SeqNotContinuous'] };
          }
        }
        if (steps[0].basis !== 'goal') {
          return { ok: false, errors: ['ValidationFailed:FirstBasisMustBeGoal'] };
        }
        // dependsOn must reference existing seq and not future
        for (const s of steps) {
          if (s.dependsOn) {
            for (const d of s.dependsOn) {
              if (d < 1 || d > steps.length) {
                return { ok: false, errors: ['ValidationFailed:DependsOnOutOfRange'] };
              }
              if (d >= s.seq) {
                return { ok: false, errors: ['ValidationFailed:DependsOnFuture'] };
              }
            }
          }
        }
      }
    }

    return { ok: true, schema: data.schema, data };
  }
}

