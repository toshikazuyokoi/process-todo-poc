import { Injectable, Logger } from '@nestjs/common';
import { AiChatProcessTemplateJson } from '../../interfaces/ai-agent/types';
import { GeneratedTemplate } from '../../../domain/ai-agent/entities/interview-session.entity';
import { CreateProcessTemplateDto } from '../../dto/process-template/create-process-template.dto';

@Injectable()
export class TemplateDraftMapper {
  private readonly logger = new Logger(TemplateDraftMapper.name);

  // PR1: ai_chat -> Session Draft
  toSessionDraft(aiChat: AiChatProcessTemplateJson): GeneratedTemplate {
    const draft = aiChat?.process_template_draft;

    const name = (draft?.name && draft.name.trim().length > 0)
      ? draft.name.trim()
      : this.fallbackName();

    const steps = Array.isArray(draft?.stepTemplates)
      ? draft!.stepTemplates.map((s, idx) => {
          const stepName = (s.name && s.name.trim().length > 0)
            ? s.name.trim()
            : `Step ${s.seq ?? idx + 1}`;

          const rawOffset = (s as any).offsetDays;
          const duration = this.safeNumber(rawOffset, 0, () => {
            this.logger.warn(`Non-numeric or missing offsetDays detected for seq=${s.seq ?? idx + 1}. Defaulting to 0.`);
          });

          const deps = Array.isArray(s.dependsOn) ? s.dependsOn.slice() : [];

          return {
            name: stepName,
            description: '', // server-side does not synthesize description in PR1
            duration,
            dependencies: deps,
          };
        })
      : [];

    return {
      name,
      steps,
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: 0.8,
        sources: [],
      },
    };
  }

  // PR1: ai_chat -> CreateProcessTemplateDto
  toCreateDtoFromAiChat(aiChat: AiChatProcessTemplateJson): CreateProcessTemplateDto {
    const draft = aiChat?.process_template_draft;

    const name = (draft?.name && draft.name.trim().length > 0)
      ? draft.name.trim()
      : this.fallbackName();

    const steps = Array.isArray(draft?.stepTemplates) ? draft!.stepTemplates : [];

    const stepTemplates = steps.map((s, idx) => {
      const seq = typeof s.seq === 'number' ? s.seq : idx + 1;
      const stepName = (s.name && s.name.trim().length > 0) ? s.name.trim() : `Step ${seq}`;

      const rawOffset = (s as any).offsetDays;
      const { value: offsetDays, clamped } = this.clampOffset(rawOffset);
      if (clamped) {
        this.logger.warn(`offsetDays out of range for seq=${seq}. Clamped to ${offsetDays}. (raw=${rawOffset})`);
      }
      if (!this.isFiniteNumber(rawOffset)) {
        this.logger.warn(`Non-numeric or missing offsetDays detected for seq=${seq}. Defaulting to 0.`);
      }

      return {
        seq,
        name: stepName,
        basis: seq === 1 ? 'goal' as const : 'prev' as const,
        offsetDays,
        requiredArtifacts: [],
        dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.slice() : [],
      };
    });

    return { name, stepTemplates };
  }

  // PR1: Draft -> CreateProcessTemplateDto
  toCreateDtoFromDraft(draft: GeneratedTemplate): CreateProcessTemplateDto {
    const name = (draft?.name && draft.name.trim().length > 0)
      ? draft.name.trim()
      : this.fallbackName();

    const steps = Array.isArray(draft?.steps) ? draft.steps : [];

    const stepTemplates = steps.map((s, idx) => {
      const seq = idx + 1;
      const stepName = (s.name && s.name.trim().length > 0) ? s.name.trim() : `Step ${seq}`;

      const { value: offsetDays, clamped } = this.clampOffset((s as any).duration);
      if (clamped) {
        this.logger.warn(`duration (mapped to offsetDays) out of range for seq=${seq}. Clamped to ${offsetDays}. (raw=${(s as any).duration})`);
      }
      if (!this.isFiniteNumber((s as any).duration)) {
        this.logger.warn(`Non-numeric or missing duration detected for seq=${seq}. Defaulting to 0.`);
      }

      return {
        seq,
        name: stepName,
        basis: seq === 1 ? 'goal' as const : 'prev' as const,
        offsetDays,
        requiredArtifacts: [],
        dependsOn: Array.isArray(s.dependencies) ? s.dependencies.slice() : [],
      };
    });

    return { name, stepTemplates };
  }

  private fallbackName(): string {
    const dt = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const stamp = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    return `AI Draft (${stamp})`;
  }

  private isFiniteNumber(v: any): v is number {
    return typeof v === 'number' && Number.isFinite(v);
  }

  private safeNumber(v: any, fallback: number, onFallback?: () => void): number {
    if (this.isFiniteNumber(v)) return v;
    if (onFallback) onFallback();
    return fallback;
  }

  private clampOffset(v: any): { value: number; clamped: boolean } {
    let value = 0;
    let clamped = false;
    if (this.isFiniteNumber(v)) {
      value = v;
    } else {
      value = 0; // default
      clamped = false; // not a clamp per se, but we log separately as non-numeric
    }
    if (value < -365) { value = -365; clamped = true; }
    if (value > 365) { value = 365; clamped = true; }
    return { value, clamped };
  }
}
