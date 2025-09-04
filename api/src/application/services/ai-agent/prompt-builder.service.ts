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
    lines.push('- 人向け日本語回答の後に、構造化JSON（ai_chat_process_template.v1）をコードフェンス（json）で1個だけ出力すること。');
    lines.push('- 余計な鍵やコメントは付与しない。厳密なJSONであること。');
    return lines.join('\n');
  }
}

