# WEEK 8-9 エラー根本原因分析レポート

## 現在の状況

SearchProcessBenchmarksUseCaseの実装とテストで繰り返しエラー修正を行っているが、根本的な問題が解決されていない。

## エラーの詳細分析

### 1. インターフェース不整合の問題

#### 1.1 ProcessKnowledgeRepository.findByIndustry メソッド
**問題点**：
- インターフェース定義: `findByIndustry(industry: string): Promise<ProcessKnowledge[]>`
- 使用箇所: `findByIndustry(industry, { limit: 50 })` (2引数で呼び出し)
- **エラー**: Expected 1 argument, but got 2

**根本原因**：
- SearchBestPracticesUseCaseのパターンをコピーしたが、ProcessKnowledgeRepositoryのインターフェースは異なる
- findByCategoryも同じ問題を持つ（1引数のみ受け付ける）

#### 1.2 WebResearchCacheRepository.storeBatch メソッド
**問題点**：
- インターフェース定義: `storeBatch(results: Array<Omit<ResearchResult, 'id' | 'createdAt'>>): Promise<ResearchResult[]>`
- ResearchResultのsource型: `'web' | 'documentation' | 'github' | 'stackoverflow' | 'other'`
- 実装での使用: `source: 'benchmark' as const`
- **エラー**: 'benchmark' is not assignable to type

**根本原因**：
- 'benchmark'は許可されたsource型に含まれていない
- SearchComplianceRequirementsUseCaseは正しく'web'を使用している

### 2. モックデータの不整合

#### 2.1 ProcessKnowledgeインターフェース
**必須フィールド**：
```typescript
interface ProcessKnowledge {
  category: string;
  industry: string;
  processType: string;
  title: string;
  description: string;
  content: any;
  tags: string[];
  source: string;
}
```

**テストでの問題**：
- 初期実装ではtitle、content、sourceフィールドが欠けていた
- SearchComplianceRequirementsUseCaseでは修正済み
- SearchProcessBenchmarksUseCaseでも同様の修正が必要

#### 2.2 ResearchResult キャッシュモック
**必須フィールド**：
```typescript
interface ResearchResult {
  id: string;
  query: string;
  url: string;
  title: string;
  content: string;
  relevanceScore: number;
  source: 'web' | 'documentation' | 'github' | 'stackoverflow' | 'other';
  createdAt: Date;
  expiresAt: Date;
}
```

**テストでの問題**：
- キャッシュモックにquery、relevanceScore、source、createdAt、expiresAtが欠けていた

## 3. 設計パターンの相違点

### SearchBestPracticesUseCase
- knowledgeServiceを使用（getRelatedTemplatesメソッド）
- キャッシュのソース: 'web'
- 非同期でWeb研究をトリガー（結果を待たない）

### SearchComplianceRequirementsUseCase
- knowledgeRepository.findByCategoryを使用（1引数）
- キャッシュのソース: 'web'
- 同期的にWeb研究を実行して結果を返す

### SearchProcessBenchmarksUseCase（問題のあるコード）
- knowledgeRepository.findByIndustryを使用（誤って2引数で呼び出し）
- キャッシュのソース: 'benchmark'（無効な値）
- 同期的にWeb研究を実行

## 4. 修正が必要な箇所

### SearchProcessBenchmarksUseCase実装ファイル
1. **行168**: `findByIndustry`の呼び出しを1引数に修正
   ```typescript
   // 現在（誤り）
   await this.knowledgeRepository.findByIndustry(searchParams.industry, { limit: 50 })
   // 修正後
   await this.knowledgeRepository.findByIndustry(searchParams.industry)
   ```

2. **行611**: キャッシュのsourceを修正
   ```typescript
   // 現在（誤り）
   source: 'benchmark' as const,
   // 修正後
   source: 'web' as const,
   ```

### SearchProcessBenchmarksUseCaseテストファイル
1. すでに修正済みのcreateKnowledgeItemヘルパー関数を活用
2. キャッシュテストの期待値も'web'に修正済み

## 5. 推奨される解決策

### 即座の修正
1. SearchProcessBenchmarksUseCase.tsの2箇所を修正
   - findByIndustryの引数を1つに
   - cache sourceを'web'に

### 長期的な改善提案
1. **Repository実装の統一**
   - findByCategory、findByIndustry、findByProcessTypeにオプション引数を追加
   - または、findWithFiltersメソッドを新規作成

2. **キャッシュソースの拡張**
   - ResearchResultのsource型に'benchmark'、'compliance'を追加
   - または、汎用的な'research'タイプを追加

3. **テストヘルパーの共通化**
   - test/utils/にモックデータファクトリーを作成
   - ProcessKnowledge、ResearchResultの完全なモックを生成

## 6. 学んだ教訓

1. **パターンコピーの危険性**
   - 既存コードをコピーする際は、インターフェースの違いを確認する
   - 特にRepositoryメソッドのシグネチャは要注意

2. **型安全性の重要性**
   - TypeScriptの型エラーを無視せず、根本原因を解決する
   - `as const`や`as any`の使用は慎重に

3. **段階的な実装**
   - まず最小限の実装でテストを通す
   - その後、機能を追加していく

4. **エラーメッセージの活用**
   - TypeScriptのエラーメッセージは問題箇所を正確に指摘している
   - Expected/Actualの違いを詳細に分析する

## 次のステップ

1. 上記の2箇所の修正を実施
2. テストを実行して全てのテストが通ることを確認
3. 統合テストを実行して、他のコンポーネントとの整合性を確認