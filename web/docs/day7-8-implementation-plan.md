# Day 7-8 実装方針検討レポート

## 調査結果

### 1. 既存のフローチャート表示
- **ProcessFlowPreview** コンポーネントが既に実装済み
- シンプルなフローチャート形式（矢印「→」で連結）
- 各ステップは以下を表示：
  - 基準タイプ（ゴール基準/前工程基準）
  - ステップ名
  - オフセット日数
  - 依存関係（依存ステップ番号のリスト）

### 2. 既存のテンプレートエディタ
- **StepTemplateEditor**: 基本的なステップ編集機能
  - ドラッグ&ドロップによる並び替え
  - ステップの追加・削除
  - 依存関係の設定
- **TemplateEditorWithUndo**: Undo/Redo機能付きエディタ
  - 履歴管理機能
  - キーボードショートカット対応

### 3. 型定義の違い

#### AI生成テンプレート (GeneratedTemplate)
```typescript
{
  id: string
  name: string
  description: string
  steps: TemplateStep[] // { id, name, description, duration, dependencies }
  metadata: { confidence, sources, etc }
}
```

#### 既存システム (ProcessTemplate)
```typescript
{
  id?: number
  name: string
  version: number
  isActive: boolean
  stepTemplates: StepTemplate[] // { seq, name, basis, offsetDays, requiredArtifacts, dependsOn }
}
```

## 実装方針（深掘り検討）

### 1. 変換ユーティリティの設計 (`/app/ai-agent/utils/template-converter.ts`)

```typescript
// AI生成テンプレート → 既存システム形式への変換
export function convertGeneratedToProcess(generated: GeneratedTemplate): ProcessTemplate {
  return {
    name: generated.name,
    version: 1,
    isActive: true,
    stepTemplates: generated.steps.map((step, index) => ({
      seq: index + 1,
      name: step.name,
      basis: index === 0 ? 'goal' : 'prev', // 最初のステップはゴール基準、他は前工程基準
      offsetDays: step.duration,
      requiredArtifacts: extractArtifacts(step.description),
      dependsOn: mapDependencies(step.dependencies, generated.steps)
    }))
  }
}

// 既存システム → AI生成テンプレート形式への変換（編集時用）
export function convertProcessToGenerated(process: ProcessTemplate): GeneratedTemplate {
  // 逆変換ロジック
}
```

### 2. コンポーネント統合アーキテクチャ

```
[AIチャット] → GeneratedTemplate生成
                    ↓
              [template-preview.tsx] （プレビュー専用）
                    ↓
              [template-converter.ts] （形式変換）
                    ↓
              [既存StepTemplateEditor] （編集）
                    ↓
              [ProcessTemplate] として保存
```

### 3. 各コンポーネントの役割

#### template-preview.tsx
- GeneratedTemplateの読み取り専用表示
- 信頼度・ソース情報の表示
- 「編集」ボタンで既存エディタへ遷移

#### step-recommendation-card.tsx
- 各ステップの詳細カード表示
- AI推奨理由の表示
- 信頼度インジケーター

#### requirements-summary.tsx
- 抽出された要件のサマリー表示
- カテゴリー別グルーピング

#### confidence-display.tsx
- 信頼度の視覚的表示（プログレスバーなど）
- 色分け（高: 緑、中: 黄、低: 赤）

#### template-editor.tsx
- 既存StepTemplateEditorのラッパー
- 変換ユーティリティを使用してデータ連携
- AI生成メタデータの保持

## メリット

1. **既存資産の活用**: StepTemplateEditorの完成度の高い編集機能をそのまま利用
2. **保守性**: 変換ロジックをutilsに分離することで、各コンポーネントの責務が明確
3. **UI統一性**: ユーザーは既存の編集UIをそのまま使えるため、学習コスト不要
4. **段階的な拡張**: 将来的にAI特有の編集機能が必要になっても、ラッパーで対応可能

## 実装順序

1. `template-converter.ts` ユーティリティ実装
2. `template-preview.tsx` 読み取り専用プレビュー
3. `step-recommendation-card.tsx` ステップカード
4. `requirements-summary.tsx` 要件サマリー  
5. `confidence-display.tsx` 信頼度表示
6. `template-editor.tsx` 編集統合ラッパー

## ファイル構成

```
web/app/ai-agent/
├── components/
│   ├── template-preview.tsx          # テンプレートプレビュー
│   ├── step-recommendation-card.tsx  # ステップ推奨カード
│   ├── requirements-summary.tsx      # 要件サマリー
│   ├── confidence-display.tsx        # 信頼度表示
│   └── template-editor.tsx           # テンプレート編集統合
└── utils/
    └── template-converter.ts          # 型変換ユーティリティ
```

## 技術的考慮事項

### データフローの整合性
- AI生成テンプレートのメタデータ（confidence, sources）は変換後も保持
- 編集後の保存時には、メタデータを含めてバックエンドに送信
- 既存システムとの互換性を保ちつつ、AI特有の情報も管理

### パフォーマンス
- 変換処理は軽量なマッピング処理のため、パフォーマンスへの影響は最小限
- 大規模なテンプレート（100ステップ以上）でも問題ない設計

### エラーハンドリング
- 変換時の不整合データのバリデーション
- 依存関係の循環参照チェック
- 必須フィールドの欠損チェック

## 今後の拡張性

1. **AI推奨の可視化強化**
   - 各ステップの推奨理由の詳細表示
   - 代替案の提示機能

2. **学習機能**
   - ユーザーの編集履歴から学習
   - より精度の高い推奨の実現

3. **バージョン管理**
   - AI生成版と編集版の差分表示
   - 変更履歴のトラッキング

---

*作成日: 2025-08-30*
*作成者: AI Agent v1.2 開発チーム*