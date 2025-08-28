# Option A 実装計画レポート

## 概要
Option Aでは、インフラストラクチャ層の`PrismaWebResearchCacheRepository`をドメイン層のインターフェースに準拠するよう修正します。

## 🔍 問題の根本原因

### インターフェースの重複定義
現在、`WebResearchCacheRepository`インターフェースが2箇所で異なる定義を持っています：

1. **ドメイン層** (`/api/src/domain/ai-agent/repositories/web-research-cache.repository.interface.ts`)
   - 正しい設計に基づく完全なインターフェース
   - `findByQuery(query: string, options?: ResearchQueryOptions): Promise<ResearchResult[]>`
   - `ResearchResult`型を返す

2. **インフラストラクチャ層** (`/api/src/infrastructure/repositories/prisma-web-research-cache.repository.ts`)
   - 独自のインターフェース定義（16-23行目）
   - `findByQuery(query: string, queryType: string): Promise<WebResearchCache | null>`
   - `WebResearchCache`型を返す

### 影響を受けるUseCase
- `SearchBestPracticesUseCase` - 3件のテストが失敗
- `SearchProcessBenchmarksUseCase` - 同様の問題の可能性
- `SearchComplianceRequirementsUseCase` - 同様の問題の可能性
- `GenerateTemplateRecommendationsUseCase` - 同様の問題の可能性

## 📋 修正計画

### 修正対象ファイル
`/api/src/infrastructure/repositories/prisma-web-research-cache.repository.ts`

### 1. インポートの修正

```typescript
// 削除する行（16-23行目）
export interface WebResearchCache { ... }
export interface WebResearchCacheRepository { ... }

// 追加する行
import { 
  WebResearchCacheRepository,
  ResearchResult,
  ResearchQueryOptions 
} from '../../../domain/ai-agent/repositories/web-research-cache.repository.interface';
```

### 2. findByQueryメソッドの修正

#### 現在の実装（60-78行目）
```typescript
async findByQuery(
  query: string,
  queryType: string,
): Promise<WebResearchCache | null> {
  try {
    const queryHash = this.createQueryHash(`${query}:${queryType}`);
    const cache = await this.prisma.aIWebResearchCache.findUnique({
      where: { queryHash },
    });
    return cache ? this.fromDbModel(cache) : null;
  } catch (error) {
    this.logger.error(`Failed to find cache by query: ${query}`, error);
    return null;
  }
}
```

#### 修正後の実装
```typescript
async findByQuery(
  query: string,
  options?: ResearchQueryOptions,
): Promise<ResearchResult[]> {
  try {
    // クエリに基づいてキャッシュを検索
    const whereClause: any = {
      queryText: { contains: query },
      expiresAt: { gt: new Date() },
    };
    
    // オプションに基づくフィルタリング
    const caches = await this.prisma.aIWebResearchCache.findMany({
      where: whereClause,
      take: options?.limit || 20,
      skip: options?.offset || 0,
      orderBy: { lastAccessedAt: 'desc' },
    });
    
    // WebResearchCacheからResearchResult[]への変換
    const results: ResearchResult[] = [];
    for (const cache of caches) {
      const cacheResults = cache.results as any[];
      if (Array.isArray(cacheResults)) {
        results.push(...cacheResults.map(r => this.toResearchResult(r, cache)));
      }
    }
    
    // 使用回数をインクリメント
    if (caches.length > 0) {
      await this.prisma.aIWebResearchCache.updateMany({
        where: { id: { in: caches.map(c => c.id) } },
        data: {
          hitCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });
    }
    
    return results;
  } catch (error) {
    this.logger.error(`Failed to find cache by query: ${query}`, error);
    return [];
  }
}
```

### 3. storeBatchメソッドの実装（新規追加）

```typescript
async storeBatch(
  results: Array<Omit<ResearchResult, 'id' | 'createdAt'>>
): Promise<ResearchResult[]> {
  try {
    const stored: ResearchResult[] = [];
    
    // 結果をクエリ別にグループ化
    const groupedByQuery = new Map<string, typeof results>();
    for (const result of results) {
      const key = result.query;
      if (!groupedByQuery.has(key)) {
        groupedByQuery.set(key, []);
      }
      groupedByQuery.get(key)!.push(result);
    }
    
    // 各クエリグループをキャッシュに保存
    for (const [query, queryResults] of groupedByQuery) {
      const queryHash = this.createQueryHash(query);
      
      const cache = await this.prisma.aIWebResearchCache.upsert({
        where: { queryHash },
        update: {
          results: queryResults as Prisma.JsonArray,
          lastAccessedAt: new Date(),
          hitCount: { increment: 1 },
          expiresAt: queryResults[0].expiresAt,
        },
        create: {
          queryHash,
          queryText: query,
          searchParameters: {} as Prisma.JsonValue,
          results: queryResults as Prisma.JsonArray,
          expiresAt: queryResults[0].expiresAt,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          hitCount: 1,
        },
      });
      
      // 保存された結果を返す形式に変換
      const cacheResults = cache.results as any[];
      stored.push(...cacheResults.map(r => this.toResearchResult(r, cache)));
    }
    
    return stored;
  } catch (error) {
    this.logger.error('Failed to store batch results', error);
    throw new Error('Failed to store batch results');
  }
}
```

### 4. ヘルパーメソッドの追加

```typescript
private toResearchResult(item: any, cache: any): ResearchResult {
  return {
    id: item.id || `${cache.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    query: cache.queryText,
    url: item.url || '',
    title: item.title || '',
    content: item.content || item.description || '',
    summary: item.summary,
    relevanceScore: item.relevance || item.relevanceScore || 0.5,
    source: item.source || 'web',
    metadata: {
      author: item.author,
      publishedDate: item.publishedAt ? new Date(item.publishedAt) : undefined,
      lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
      tags: item.tags || [],
      language: item.language,
    },
    createdAt: cache.createdAt,
    expiresAt: cache.expiresAt,
  };
}
```

### 5. その他の必須メソッド実装

ドメインインターフェースで定義されているが未実装のメソッド：

#### 必須（テスト通過に必要）
- `store()` - 単一結果の保存
- `findById()` - ID による検索

#### 推奨（インターフェースの完全性）
- `findSimilarQueries()` - 類似クエリ検索
- `findByUrl()` - URL による検索
- `findBySource()` - ソースによる検索
- `isCached()` - キャッシュ存在確認
- `updateRelevance()` - 関連性スコア更新
- `extendExpiration()` - 有効期限延長
- `deleteByQuery()` - クエリによる削除
- `getTopResults()` - トップ結果取得
- `getRecentQueries()` - 最近のクエリ取得
- `markAsUsed()` - 使用マーク
- `getUsageStats()` - 使用統計取得

### 6. 既存メソッドの調整

- `clearAll()` → `clear()` にリネーム
- `findRecent()` → private に変更または削除
- `findByQueryType()` → 削除（ドメインインターフェースにない）
- `findValid()` → private ヘルパーとして保持
- `invalidate()` → private に変更または削除

## 🎯 実装の優先順位

### Phase 1: 最小限の修正（テスト通過）
1. インポートの修正
2. `findByQuery()` の修正
3. `storeBatch()` の実装
4. `toResearchResult()` ヘルパーの追加

### Phase 2: インターフェースの完全実装
1. `store()` メソッド
2. `findById()` メソッド
3. その他の検索メソッド

### Phase 3: 機能拡張
1. 統計系メソッド
2. 使用追跡メソッド

## ⚠️ リスクと対策

### リスク1: データ構造の不一致
- **問題**: DBの`results`フィールドはJSON配列で、様々な形式のデータを含む可能性
- **対策**: 堅牢な変換ロジックで型安全性を確保

### リスク2: 既存データとの互換性
- **問題**: 既存のキャッシュデータが新しい形式と異なる可能性
- **対策**: 柔軟な変換処理で既存データも読み取れるようにする

### リスク3: パフォーマンス
- **問題**: 複数のキャッシュエントリから結果を集約する処理のコスト
- **対策**: 
  - 適切なインデックス（queryHash, expiresAt）は既に設定済み
  - 必要に応じてクエリの最適化

## 📊 影響分析

### 影響を受けないもの
- **テストファイル**: 修正不要（既に正しいインターフェースを期待）
- **UseCase**: 修正不要（既に正しいインターフェースを使用）
- **DI設定**: 修正不要（infrastructure.module.tsは既に正しく設定）
- **データベース**: スキーマ変更不要

### 影響を受ける可能性があるもの
- 既存のキャッシュデータの読み取り（変換ロジックで対応）
- パフォーマンス（最適化で対応）

## 🔧 実装時の注意点

1. **型安全性の確保**
   - TypeScriptの厳密な型チェックを活用
   - any型の使用を最小限に
   - 明示的な型変換

2. **エラーハンドリング**
   - 既存のtry-catchパターンを維持
   - エラーログを適切に記録
   - nullやundefinedの適切な処理

3. **後方互換性**
   - 既存のキャッシュデータが読み取れることを確認
   - データマイグレーションは不要（データ形式は変更なし）

4. **テスト**
   - 修正後は全てのテストを実行
   - 特に`SearchBestPracticesUseCase`のテストに注目

## 📈 期待される結果

この修正により：
1. `SearchBestPracticesUseCase`の失敗している3つのテストが通過
2. 他のAI Agent関連のUseCaseも正しく動作
3. ドメイン駆動設計の原則に準拠した実装

## 🚀 次のステップ

1. このレポートのレビューと承認
2. Phase 1の実装（最小限の修正）
3. テストの実行と確認
4. 必要に応じてPhase 2, 3の実装