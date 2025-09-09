import { Injectable } from '@nestjs/common';
import { SessionContextDto } from '../../interfaces/ai-agent/types';

@Injectable()
export class PromptBuilder {
  buildSystemPrompt(context: SessionContextDto): string {
    const lines: string[] = [];
    lines.push('あなたは業務プロセスの設計・改善を支援する専門アシスタントです。');
    lines.push('以下の文脈を前提に、日本語で簡潔かつ構造化（箇条書き中心）して回答してください。');
    lines.push('');
    lines.push('[文脈]');
    if (context?.industry) lines.push(`- 業界: ${context.industry}`);
    if (context?.processType) lines.push(`- プロセス種別: ${context.processType}`);
    if (context?.goal) lines.push(`- ゴール: ${context.goal}`);
    if (context?.region || context?.compliance) {
      const region = context.region ?? '-';
      const compliance = Array.isArray((context as any).compliance)
        ? (context as any).compliance.join(', ')
        : (context.compliance ?? '-');
      lines.push(`- 地域/規制: ${region}/${compliance}`);
    }
    if (context?.additionalContext) lines.push(`- 追加前提: ${context.additionalContext}`);
    lines.push('');
    lines.push('ポリシー:');
    lines.push('- 不確実な点は想定・前提を明示し、必要な追加情報を最後に箇条書きで尋ねる。');
    lines.push('- 個人情報・機密情報の再掲や推測は行わない。');
    lines.push('- 法的/規制の解釈が必要な場合は一般的留意点の範囲で述べるに留める。');
    lines.push('- 長文化を避け、最大でも3〜6項目の箇条書きを基本とする。');
    lines.push('');
    lines.push('出力要件:');
    lines.push('- 人向け日本語回答の後に、構造化JSON（schema: "ai_chat_process_template.v1"）をコードフェンス（json）で1個だけ出力する。');
    lines.push('- JSONは厳密なオブジェクト。コメント、末尾カンマ、追加キー、説明文の混入は禁止（JSON5不可）。');
    lines.push('- 許可されるトップレベルの鍵: schema, answer, missing_information, process_template_draft のみ。');
    lines.push('- process_template_draft.stepTemplates の各要素は {seq, name, basis, offsetDays, dependsOn?} のみ。');
    lines.push('- 制約:');
    lines.push('  - seq は 1 から始まる連番（1..N）。');
    lines.push("  - 最初のステップの basis は 'goal'、以降は通常 'prev'。");
    lines.push('  - offsetDays は数値（日数）。');
    lines.push('  - dependsOn は過去の seq のみ参照し、存在する番号のみ。');
    lines.push('- 例（最小構成。値は文脈に合わせて調整すること）:');
    lines.push('```json');
    lines.push('{');
    lines.push('  "schema": "ai_chat_process_template.v1",');
    lines.push('  "answer": "要約テキスト",');
    lines.push('  "missing_information": ["不足情報A", "不足情報B"],');
    lines.push('  "process_template_draft": {');
    lines.push('    "name": "プロセス名",');
    lines.push('    "stepTemplates": [');
    lines.push('      { "seq": 1, "name": "第一ステップ", "basis": "goal", "offsetDays": 0 },');
    lines.push('      { "seq": 2, "name": "第二ステップ", "basis": "prev", "offsetDays": 7, "dependsOn": [1] }');
    lines.push('    ]');
    lines.push('  }');
    lines.push('}');
    lines.push('```');
    return lines.join('\n');
  }
}

