# WebResearchCacheRepository 最小限実装分析レポート

## エグゼクティブサマリー

ドメインインターフェース `WebResearchCacheRepository` には19個のメソッドが定義されていますが、実際の使用状況を分析した結果、**実際に使われているのは2つのメソッドのみ**であることが判明しました。

## 1. 実際の使用状況

### 使用されているメソッド（2個）

| メソッド | 使用箇所 | 用途 |
|---------|---------|------|
| `findByQuery` | 4つのUseCase | キャッシュされた研究結果の検索 |
| `storeBatch` | 4つのUseCase | Web研究結果のバッチ保存 |

### 使用していないメソッド（17個）

```typescript
- store()                // 単一保存（storeBatchで代替可能）
- findById()            // ID検索（不使用）
- findSimilarQueries()  // 類似クエリ検索（不使用）
- findByUrl()           // URL検索（不使用）
- findBySource()        // ソース別検索（不使用）
- isCached()            // キャッシュ存在確認（不使用）
- getCacheStatistics()  // 統計情報（不使用）
- updateRelevance()     // 関連性更新（不使用）
- extendExpiration()    // 有効期限延長（不使用）
- deleteExpired()       // 期限切れ削除（不使用）
- delete()              // 削除（不使用）
- deleteByQuery()       // クエリ削除（不使用）
- clear()               // 全削除（不使用）
- getTopResults()       // トップ結果（不使用）
- getRecentQueries()    // 最近のクエリ（不使用）
- markAsUsed()          // 使用マーク（不使用）
- getUsageStats()       // 使用統計（不使用）
```

## 2. 使用箇所の詳細

### SearchBestPracticesUseCase
```typescript
// Line 183: キャッシュ検索
const cached = await this.cacheRepository.findByQuery(input.query, {
  limit: 20,
});

// Line 231: 結果の保存（fire-and-forget）
this.cacheRepository.storeBatch(
  results.map((r: any) => ({...}))
);
```

### SearchProcessBenchmarksUseCase
```typescript
// Line 202: キャッシュ検索
const cached = await this.cacheRepository.findByQuery(cacheKey, {
  limit: 20,
});

// Line 602: 結果の保存
await this.cacheRepository.storeBatch(
  results.map(r => ({...}))
);
```

### SearchComplianceRequirementsUseCase
```typescript
// Line 199: キャッシュ検索
const cached = await this.cacheRepository.findByQuery(cacheKey, {
  limit: 20,
});

// Line 407: 結果の保存
await this.cacheRepository.storeBatch(
  results.map(r => ({...}))
);
```

### GenerateTemplateRecommendationsUseCase
- WebResearchCacheRepositoryは注入されていますが、実際には使用されていません

## 3. 問題分析

### 3.1 過剰設計（Over-Engineering）

**問題点：**
- 19個のメソッドのうち、89.5%（17個）が未使用
- YAGNI原則（You Aren't Gonna Need It）違反
- 複雑性の無駄な増加

**根本原因：**
- 将来の拡張を過度に想定した設計
- 実際のユースケースに基づかない機能追加
- 汎用的なキャッシュシステムを想定した設計

### 3.2 設計書との不整合

**観察結果：**
- `ai_agent_class_diagram.md` には`WebResearchCacheRepository`の記載なし
- Week 8-9の実装計画では言及されているが、詳細な仕様なし
- ドメインエキスパートからの要求が不明確

### 3.3 実装の不整合

**現在の状況：**
- インフラ層が独自インターフェースを実装
- ドメイン層のインターフェースが過剰に複雑
- 実際の使用パターンと設計の乖離

## 4. 推奨解決策

### Option A: 最小限実装（推奨）

**アプローチ：**
1. 実際に使用される2つのメソッドのみ実装
2. 未使用メソッドはスタブまたは未実装例外
3. 将来必要になった時点で実装

**メリット：**
- 実装コストが最小
- テストが即座に通過
- 保守性が高い

**実装内容：**
```typescript
class PrismaWebResearchCacheRepository implements WebResearchCacheRepository {
  // 実際に使用される2つのメソッドのみ実装
  async findByQuery(query: string, options?: ResearchQueryOptions): Promise<ResearchResult[]> {
    // 実装
  }
  
  async storeBatch(results: Array<Omit<ResearchResult, 'id' | 'createdAt'>>): Promise<ResearchResult[]> {
    // 実装
  }
  
  // その他のメソッドは未実装例外
  async store(): Promise<ResearchResult> {
    throw new Error('Not implemented - not required for current use cases');
  }
  // ... 他の未使用メソッドも同様
}
```

### Option B: インターフェースの削減

**アプローチ：**
1. ドメインインターフェースを実使用に合わせて削減
2. 必要な2つのメソッドのみ定義
3. 将来の拡張はインターフェース拡張で対応

**メリット：**
- インターフェースが明確
- 不要な複雑性の排除
- DDDの原則に準拠

**デメリット：**
- ドメイン層の変更が必要
- 他のチームへの影響可能性

### Option C: 段階的実装

**アプローチ：**
1. Phase 1: 必須2メソッドの実装
2. Phase 2: 削除系メソッドの実装（メンテナンス用）
3. Phase 3: 統計系メソッドの実装（監視用）

**メリット：**
- 段階的な機能追加
- リスクの分散

**デメリット：**
- 実装計画の管理が必要
- 未使用コードの増加

## 5. 推奨事項

### 即座の対応（Phase 1）

1. **最小限実装を採用**
   - `findByQuery` と `storeBatch` のみ実装
   - その他は NotImplementedException

2. **テストの通過を確認**
   - 3つの失敗テストが通過することを確認
   - 他のテストへの影響なしを確認

### 中期的対応（Phase 2）

1. **実使用パターンの観察**
   - 3ヶ月間の使用状況モニタリング
   - 新たに必要なメソッドの特定

2. **インターフェースの見直し**
   - 不要なメソッドの削除検討
   - 実際のニーズに基づく再設計

### 長期的対応（Phase 3）

1. **設計原則の確立**
   - YAGNI原則の徹底
   - 実使用ベースの設計

2. **ドキュメント化**
   - 実装判断の根拠を文書化
   - 将来の拡張ポイントの明確化

## 6. 結論

現在の `WebResearchCacheRepository` インターフェースは過剰設計の典型例です。19個のメソッドのうち2個しか使用されていないという事実は、設計時に実際のユースケースが十分に検討されていなかったことを示しています。

**推奨アクション：**
1. 最小限実装（Option A）を即座に適用
2. テストを通過させて開発を前進
3. 実使用パターンに基づいて将来の拡張を検討

この approach により、技術的負債を増やすことなく、現在の問題を解決し、将来の拡張性も確保できます。

## 付録: 実装優先度マトリクス

| 優先度 | メソッド | 理由 | 実装時期 |
|--------|---------|------|----------|
| P0（必須） | findByQuery | 現在使用中 | 即座 |
| P0（必須） | storeBatch | 現在使用中 | 即座 |
| P3（低） | deleteExpired | メンテナンス用 | 必要時 |
| P3（低） | getCacheStatistics | 監視用 | 必要時 |
| P4（不要） | その他15メソッド | 使用予定なし | 実装不要 |