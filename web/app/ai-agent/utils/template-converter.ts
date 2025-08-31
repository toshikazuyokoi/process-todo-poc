/**
 * Template Converter Utility
 * Converts between AI-generated templates and existing system templates
 */

import { GeneratedTemplate, TemplateStep } from '../types';
import { ProcessTemplate, StepTemplate } from '@/app/types';

/**
 * Extract artifacts from step description
 * Parses description to identify deliverables/artifacts
 */
function extractArtifacts(description: string): Array<{ kind: string; description?: string }> {
  const artifacts: Array<{ kind: string; description?: string }> = [];
  
  // Common artifact patterns to detect
  const patterns = [
    { pattern: /設計書|design document/i, kind: 'document', description: '設計書' },
    { pattern: /実装|implementation|コード|code/i, kind: 'code', description: '実装コード' },
    { pattern: /テスト|test/i, kind: 'test', description: 'テスト結果' },
    { pattern: /レビュー|review/i, kind: 'review', description: 'レビュー記録' },
    { pattern: /ドキュメント|documentation/i, kind: 'document', description: 'ドキュメント' },
    { pattern: /リリース|release|デプロイ|deploy/i, kind: 'release', description: 'リリース成果物' },
  ];

  patterns.forEach(({ pattern, kind, description }) => {
    if (pattern.test(description)) {
      artifacts.push({ kind, description });
    }
  });

  // Return at least one default artifact if none detected
  if (artifacts.length === 0) {
    artifacts.push({ kind: 'deliverable', description: '成果物' });
  }

  return artifacts;
}

/**
 * Map step dependencies from string IDs to sequence numbers
 */
function mapDependencies(dependencies: string[], allSteps: TemplateStep[]): number[] {
  if (!dependencies || dependencies.length === 0) return [];

  return dependencies
    .map(depId => {
      const index = allSteps.findIndex(step => step.id === depId);
      return index >= 0 ? index + 1 : null;
    })
    .filter((seq): seq is number => seq !== null);
}

/**
 * Convert AI-generated template to existing system format
 */
export function convertGeneratedToProcess(generated: GeneratedTemplate): ProcessTemplate {
  return {
    name: generated.name,
    version: 1,
    isActive: true,
    stepTemplates: generated.steps.map((step, index) => ({
      seq: index + 1,
      name: step.name,
      basis: index === 0 ? 'goal' : 'prev', // First step is goal-based, others are previous-based
      offsetDays: step.duration || 1, // Default to 1 day if duration not specified
      requiredArtifacts: extractArtifacts(step.description),
      dependsOn: mapDependencies(step.dependencies, generated.steps),
    })),
  };
}

/**
 * Convert existing system template to AI-generated format (for editing)
 */
export function convertProcessToGenerated(
  process: ProcessTemplate,
  metadata?: {
    confidence?: number;
    sources?: string[];
    generatedAt?: Date | string;
    generationTime?: number;
  }
): GeneratedTemplate {
  const steps: TemplateStep[] = (process.stepTemplates || []).map((step, index) => ({
    id: `step-${step.id || index + 1}`,
    name: step.name,
    description: generateStepDescription(step),
    duration: step.offsetDays,
    dependencies: mapSequenceDependencies(step.dependsOn, process.stepTemplates || []),
  }));

  return {
    id: `template-${process.id || Date.now()}`,
    sessionId: '', // Will be filled by the caller if needed
    name: process.name,
    description: `${process.name} - Version ${process.version}`,
    steps,
    metadata: {
      generatedAt: metadata?.generatedAt || new Date().toISOString(),
      generationTime: metadata?.generationTime || 0,
      confidence: metadata?.confidence || 0.8,
      sources: metadata?.sources || [],
      version: process.version,
      isActive: process.isActive,
    },
  };
}

/**
 * Generate description from step template
 */
function generateStepDescription(step: StepTemplate): string {
  let description = step.name;
  
  if (step.requiredArtifacts && step.requiredArtifacts.length > 0) {
    const artifactsList = step.requiredArtifacts
      .map(a => a.description || a.kind)
      .join('、');
    description += `\n必要な成果物: ${artifactsList}`;
  }
  
  if (step.basis === 'goal') {
    description += `\n基準: ゴールから${Math.abs(step.offsetDays)}日前`;
  } else {
    description += `\n基準: 前工程から${step.offsetDays}日後`;
  }
  
  return description;
}

/**
 * Map sequence number dependencies to step IDs
 */
function mapSequenceDependencies(dependsOn: number[] | undefined, allSteps: StepTemplate[]): string[] {
  if (!dependsOn || dependsOn.length === 0) return [];

  return dependsOn
    .map(seq => {
      const step = allSteps.find(s => s.seq === seq);
      return step ? `step-${step.id || seq}` : null;
    })
    .filter((id): id is string => id !== null);
}

/**
 * Validate template conversion
 * Checks for data integrity and required fields
 */
export function validateTemplateConversion(template: ProcessTemplate): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.name || template.name.trim() === '') {
    errors.push('テンプレート名は必須です');
  }

  if (!template.stepTemplates || template.stepTemplates.length === 0) {
    errors.push('少なくとも1つのステップが必要です');
  }

  // Check for circular dependencies
  template.stepTemplates?.forEach((step, index) => {
    if (step.dependsOn?.includes(step.seq)) {
      errors.push(`ステップ ${index + 1} は自分自身に依存できません`);
    }

    // Check dependencies exist
    step.dependsOn?.forEach(depSeq => {
      if (!template.stepTemplates?.some(s => s.seq === depSeq)) {
        errors.push(`ステップ ${index + 1} の依存先ステップ ${depSeq} が存在しません`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Merge AI metadata with process template
 * Preserves AI-specific information during conversion
 */
export function mergeAIMetadata(
  processTemplate: ProcessTemplate,
  aiMetadata: {
    confidence: number;
    sources: string[];
    extractedRequirements?: Array<{
      category: string;
      content: string;
      priority: string;
    }>;
  }
): ProcessTemplate & { aiMetadata: typeof aiMetadata } {
  return {
    ...processTemplate,
    aiMetadata,
  };
}