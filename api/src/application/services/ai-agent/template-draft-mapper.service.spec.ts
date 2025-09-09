import { TemplateDraftMapper } from './template-draft-mapper.service';
import { AiChatProcessTemplateJson, AiChatSchemaId } from '../../interfaces/ai-agent/types';

function makeAiChat(overrides?: Partial<AiChatProcessTemplateJson>): AiChatProcessTemplateJson {
  return {
    schema: AiChatSchemaId.ProcessTemplateV1,
    answer: 'テスト回答',
    process_template_draft: {
      name: 'サンプルプロセス',
      stepTemplates: [
        { seq: 1, name: '要件整理', basis: 'goal', offsetDays: 0 },
        { seq: 2, name: '設計', basis: 'prev', offsetDays: 3, dependsOn: [1] },
        { seq: 3, name: '実装', basis: 'prev', offsetDays: 5, dependsOn: [1, 2] },
      ],
    },
    ...overrides,
  } as AiChatProcessTemplateJson;
}

describe('TemplateDraftMapper', () => {
  let mapper: TemplateDraftMapper;

  beforeEach(() => {
    mapper = new TemplateDraftMapper();
  });

  describe('toSessionDraft', () => {
    it('maps ai_chat to GeneratedTemplate with defaults', () => {
      const ai = makeAiChat();
      const draft = mapper.toSessionDraft(ai);

      expect(draft.name).toBe('サンプルプロセス');
      expect(draft.steps.length).toBe(3);
      expect(draft.steps[0]).toEqual({ name: '要件整理', description: '', duration: 0, dependencies: [] });
      expect(draft.steps[1]).toEqual({ name: '設計', description: '', duration: 3, dependencies: [1] });
      expect(draft.steps[2]).toEqual({ name: '実装', description: '', duration: 5, dependencies: [1, 2] });
      expect(draft.metadata.confidence).toBeGreaterThan(0);
      expect(Array.isArray(draft.metadata.sources)).toBe(true);
      expect(typeof draft.metadata.generatedAt).toBe('string');
    });

    it('uses fallback name and empty steps when draft missing', () => {
      const ai = makeAiChat({ process_template_draft: undefined } as any);
      const draft = mapper.toSessionDraft(ai);
      expect(draft.name.startsWith('AI Draft (')).toBe(true);
      expect(draft.steps).toEqual([]);
    });

    it('logs WARN and defaults duration when offsetDays missing or non-numeric', () => {
      const ai = makeAiChat({
        process_template_draft: {
          name: 'X',
          stepTemplates: [
            { seq: 1, name: 'A', basis: 'goal', offsetDays: NaN as any },
            { seq: 2, name: 'B', basis: 'prev', offsetDays: undefined as any },
          ],
        },
      } as any);
      const draft = mapper.toSessionDraft(ai);
      expect(draft.steps[0].duration).toBe(0);
      expect(draft.steps[1].duration).toBe(0);
    });
  });

  describe('toCreateDtoFromAiChat', () => {
    it('maps ai_chat to CreateProcessTemplateDto and clamps offsetDays', () => {
      const ai = makeAiChat({
        process_template_draft: {
          name: 'P',
          stepTemplates: [
            { seq: 1, name: 'S1', basis: 'goal', offsetDays: -999 },
            { seq: 2, name: 'S2', basis: 'prev', offsetDays: 999, dependsOn: [1] },
          ],
        },
      } as any);

      const dto = mapper.toCreateDtoFromAiChat(ai);
      expect(dto.name).toBe('P');
      expect(dto.stepTemplates.length).toBe(2);
      expect(dto.stepTemplates[0]).toEqual({ seq: 1, name: 'S1', basis: 'goal', offsetDays: -365, requiredArtifacts: [], dependsOn: [] });
      expect(dto.stepTemplates[1]).toEqual({ seq: 2, name: 'S2', basis: 'prev', offsetDays: 365, requiredArtifacts: [], dependsOn: [1] });
    });

    it('fills defaults when fields are missing', () => {
      const ai = makeAiChat({
        process_template_draft: {
          name: '',
          stepTemplates: [
            { seq: 1, name: '', basis: 'goal', offsetDays: 0 },
            { name: '', basis: 'prev', offsetDays: 2 } as any,
          ],
        },
      } as any);

      const dto = mapper.toCreateDtoFromAiChat(ai);
      expect(dto.name.startsWith('AI Draft (')).toBe(true);
      expect(dto.stepTemplates[0].name).toBe('Step 1');
      expect(dto.stepTemplates[1].seq).toBe(2);
      expect(dto.stepTemplates[1].name).toBe('Step 2');
      expect(dto.stepTemplates[0].requiredArtifacts).toEqual([]);
    });
  });

  describe('toCreateDtoFromDraft', () => {
    it('maps GeneratedTemplate to CreateProcessTemplateDto with basis and dependsOn', () => {
      const ai = makeAiChat();
      const draft = mapper.toSessionDraft(ai);
      const dto = mapper.toCreateDtoFromDraft(draft);

      expect(dto.name).toBe(draft.name);
      expect(dto.stepTemplates[0]).toEqual({ seq: 1, name: '要件整理', basis: 'goal', offsetDays: 0, requiredArtifacts: [], dependsOn: [] });
      expect(dto.stepTemplates[1]).toEqual({ seq: 2, name: '設計', basis: 'prev', offsetDays: 3, requiredArtifacts: [], dependsOn: [1] });
      expect(dto.stepTemplates[2]).toEqual({ seq: 3, name: '実装', basis: 'prev', offsetDays: 5, requiredArtifacts: [], dependsOn: [1, 2] });
    });

    it('clamps duration (mapped to offsetDays) when out of range', () => {
      const draft = {
        name: 'D',
        steps: [
          { name: 'A', description: '', duration: -999, dependencies: [] },
          { name: 'B', description: '', duration: 999, dependencies: [1] },
        ],
        metadata: { generatedAt: new Date().toISOString(), confidence: 0.8, sources: [] },
      };

      const dto = mapper.toCreateDtoFromDraft(draft as any);
      expect(dto.stepTemplates[0].offsetDays).toBe(-365);
      expect(dto.stepTemplates[1].offsetDays).toBe(365);
    });
  });
});

