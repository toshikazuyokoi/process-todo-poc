# Week 8-9 未実装機能 - 詳細分析レポート

## エグゼクティブサマリー

Week 8-9の実装タスクにおいて、以下の機能が未実装であることが判明しました：
1. **SearchComplianceRequirementsUseCase** - コンプライアンス要件検索機能
2. **SearchProcessBenchmarksUseCase** - プロセスベンチマーク検索機能  
3. **コントローラーエンドポイント統合** - 2つのエンドポイントが未実装

本レポートでは、設計書と既存コードベースを深く分析し、各機能の実装仕様を詳述します。

## 1. SearchComplianceRequirementsUseCase

### 1.1 設計仕様

#### エンドポイント
```
GET /api/ai-agent/research/compliance
```

#### 目的
業界別・地域別のコンプライアンス要件を検索し、プロセステンプレートに必要な規制要件を特定する。

#### 設計書参照
- **実装計画書**: Week 8-9, Task 2.4（4日工数）
- **技術設計書**: エンドポイント定義（Line 209）
- **クラス図**: SearchComplianceRequirementsUseCase（未記載だが設計に含まれる）

### 1.2 実装仕様

#### ファイル構造
```
api/src/application/usecases/ai-agent/search-compliance-requirements.usecase.ts
api/src/application/usecases/ai-agent/search-compliance-requirements.usecase.spec.ts
api/src/application/dto/ai-agent/compliance-requirements.dto.ts
```

#### 入出力インターフェース
```typescript
// Input
interface SearchComplianceRequirementsInput {
  userId: number;
  query: string;
  filters?: {
    industry: string;      // 必須: 業界（healthcare, finance, etc）
    region?: string;       // 地域（US, EU, JP）
    category?: string;     // カテゴリ（data-privacy, security, audit）
    severity?: 'critical' | 'high' | 'medium' | 'low';
  };
  limit?: number;
}

// Output  
interface SearchComplianceRequirementsOutput {
  query: string;
  results: ComplianceRequirement[];
  totalResults: number;
  searchedAt: Date;
  filters: any;
}

// ComplianceRequirement
interface ComplianceRequirement {
  id: string;
  name: string;                    // 例: "GDPR Article 32"
  description: string;
  category: string;                 // data-privacy, security, audit
  severity: string;                 // critical, high, medium, low
  industry: string;
  region: string;
  source: 'regulatory' | 'industry_standard' | 'web_research';
  regulatoryBody?: string;          // 例: "European Commission"
  effectiveDate?: Date;
  complianceDeadline?: Date;
  requiredActions: string[];        // 必要なアクション
  penalties?: string;               // 違反時のペナルティ
  references: string[];             // 参照URL
  relevance: number;                // 0-1の関連性スコア
}
```

#### 処理フロー
```typescript
1. validateInput()
   - industryフィルターの必須チェック
   - regionの妥当性検証（ISO 3166準拠）

2. searchRegulatoryDatabase()
   - ProcessKnowledgeRepositoryから規制要件を検索
   - industry + region + categoryでフィルタリング

3. searchWebCompliance()
   - WebResearchServiceで最新の規制情報を取得
   - クエリ例: "{industry} compliance requirements {region} 2024"

4. validateComplianceData()
   - InformationValidationServiceで情報の正確性を検証
   - 規制当局の公式ソースを優先

5. rankByImportance()
   - severityとcomplianceDeadlineで優先順位付け
   - criticalな要件を上位に

6. formatOutput()
   - ComplianceRequirement[]に変換
   - 関連性スコアでソート
```

#### 依存関係
```typescript
- ProcessKnowledgeRepository（既存）
- WebResearchCacheRepository（既存）
- WebResearchService（既存）
- InformationValidationService（既存）
```

### 1.3 SearchBestPracticesUseCaseとの相違点

| 項目 | SearchBestPractices | SearchCompliance |
|------|-------------------|-----------------|
| 必須フィルター | なし | industry必須 |
| 検索対象 | ベストプラクティス | 規制要件 |
| 重要度判定 | relevanceスコア | severity + deadline |
| 情報源重み付け | なし | 公式ソース優先 |
| キャッシュ期間 | 24時間 | 7日（規制は変更頻度低） |

## 2. SearchProcessBenchmarksUseCase

### 2.1 設計仕様

#### エンドポイント
```
GET /api/ai-agent/research/benchmarks
```

#### 目的
業界標準のプロセスベンチマーク（KPI、メトリクス、パフォーマンス基準）を検索し、テンプレート生成時の目標値設定に活用する。

### 2.2 実装仕様

#### ファイル構造
```
api/src/application/usecases/ai-agent/search-process-benchmarks.usecase.ts
api/src/application/usecases/ai-agent/search-process-benchmarks.usecase.spec.ts
api/src/application/dto/ai-agent/process-benchmarks.dto.ts
```

#### 入出力インターフェース
```typescript
// Input
interface SearchProcessBenchmarksInput {
  userId: number;
  query: string;
  filters?: {
    industry: string;
    processType: string;      // development, manufacturing, sales
    metricType?: string;      // time, cost, quality, efficiency
    companySize?: 'small' | 'medium' | 'large' | 'enterprise';
    region?: string;
  };
  limit?: number;
}

// Output
interface SearchProcessBenchmarksOutput {
  query: string;
  results: ProcessBenchmark[];
  totalResults: number;
  searchedAt: Date;
  filters: any;
}

// ProcessBenchmark
interface ProcessBenchmark {
  id: string;
  name: string;                     // 例: "Software Release Cycle Time"
  description: string;
  category: string;                  // time, cost, quality, efficiency
  industry: string;
  processType: string;
  metricUnit: string;               // days, hours, percentage, count
  benchmarkValues: {
    p25: number;                    // 25パーセンタイル
    p50: number;                    // 中央値
    p75: number;                    // 75パーセンタイル
    p90: number;                    // 90パーセンタイル
    average?: number;
  };
  source: 'industry_report' | 'research_paper' | 'web_research';
  methodology?: string;             // データ収集方法
  sampleSize?: number;              // サンプル数
  year: number;                     // ベンチマークの年度
  companySize?: string;
  region?: string;
  tags: string[];
  references: string[];
  confidence: number;               // データ信頼度 0-1
  relevance: number;               // 関連性スコア 0-1
}
```

#### 処理フロー
```typescript
1. validateInput()
   - processTypeの検証
   - metricTypeの妥当性チェック

2. searchBenchmarkDatabase()
   - ProcessKnowledgeRepositoryからベンチマークデータ検索
   - 業界・プロセスタイプでフィルタリング

3. searchIndustryReports()
   - WebResearchServiceで業界レポートを検索
   - クエリ例: "{industry} {processType} benchmarks KPI metrics 2024"

4. extractMetricValues()
   - テキストから数値データを抽出
   - パーセンタイル値を計算

5. normalizeMetrics()
   - 単位を統一（例: 全て日数に変換）
   - 外れ値の除外

6. calculateConfidence()
   - サンプルサイズとソースの信頼性から信頼度を計算
   - 年度による減衰（古いデータは信頼度低下）

7. rankResults()
   - relevance × confidence でスコアリング
   - 最新かつ信頼性の高いデータを優先
```

#### SearchBestPracticesUseCaseとの相違点

| 項目 | SearchBestPractices | SearchBenchmarks |
|------|-------------------|-----------------|
| 返却データ | テキスト中心 | 数値データ中心 |
| フィルター | 一般的 | メトリクス特化 |
| 処理 | テキスト検索 | 数値抽出・統計処理 |
| 信頼性評価 | relevanceのみ | confidence × relevance |
| キャッシュ | 24時間 | 30日（ベンチマークは安定） |

## 3. コントローラーエンドポイント統合

### 3.1 現状分析

#### 実装済みエンドポイント
```typescript
// AIAgentController（実装済み）
POST /api/ai-agent/sessions
GET  /api/ai-agent/sessions/{sessionId}
DELETE /api/ai-agent/sessions/{sessionId}
POST /api/ai-agent/sessions/{sessionId}/messages
GET  /api/ai-agent/sessions/{sessionId}/messages
POST /api/ai-agent/sessions/{sessionId}/generate-template
POST /api/ai-agent/sessions/{sessionId}/finalize-template
POST /api/ai-agent/knowledge/feedback
POST /api/ai-agent/knowledge/best-practices/search  // ※URLパス不一致
```

#### 未実装エンドポイント
```typescript
GET /api/ai-agent/research/compliance     // SearchComplianceRequirements
GET /api/ai-agent/research/benchmarks     // SearchProcessBenchmarks
```

### 3.2 実装方法

#### コントローラーメソッド追加
```typescript
// ai-agent.controller.ts に追加

@Get('research/compliance')
@ApiOperation({ summary: 'Search compliance requirements' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Compliance requirements retrieved successfully',
  type: SearchComplianceRequirementsResponseDto,
})
async searchCompliance(
  @Request() req: any,
  @Query() dto: SearchComplianceRequirementsDto,
): Promise<SearchComplianceRequirementsResponseDto> {
  const result = await this.searchComplianceUseCase.execute({
    userId: req.user.id,
    query: dto.query,
    filters: dto.filters,
    limit: dto.limit,
  });
  return result;
}

@Get('research/benchmarks')
@ApiOperation({ summary: 'Search process benchmarks' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Process benchmarks retrieved successfully',
  type: SearchProcessBenchmarksResponseDto,
})
async searchBenchmarks(
  @Request() req: any,
  @Query() dto: SearchProcessBenchmarksDto,
): Promise<SearchProcessBenchmarksResponseDto> {
  const result = await this.searchBenchmarksUseCase.execute({
    userId: req.user.id,
    query: dto.query,
    filters: dto.filters,
    limit: dto.limit,
  });
  return result;
}
```

#### 依存性注入
```typescript
constructor(
  // 既存の依存性...
  private readonly searchComplianceUseCase: SearchComplianceRequirementsUseCase,
  private readonly searchBenchmarksUseCase: SearchProcessBenchmarksUseCase,
) {}
```

### 3.3 URLパス整合性の問題

設計書では `/api/ai-agent/research/*` だが、実装済みのbest-practicesは `/api/ai-agent/knowledge/best-practices/search` になっている。

**推奨対応**：
1. 新規2つは設計書通り `/research/*` で実装
2. best-practicesも `/research/best-practices` にエイリアスを追加
3. 既存パスは後方互換性のため残す

## 4. 実装優先順位と工数見積もり

### 4.1 実装順序

1. **DTOファイル作成**（2時間）
   - compliance-requirements.dto.ts
   - process-benchmarks.dto.ts

2. **SearchComplianceRequirementsUseCase**（6時間）
   - コア実装: 4時間
   - テスト作成: 2時間

3. **SearchProcessBenchmarksUseCase**（8時間）
   - コア実装: 5時間（数値処理が複雑）
   - テスト作成: 3時間

4. **コントローラー統合**（2時間）
   - メソッド追加: 1時間
   - 統合テスト: 1時間

**合計工数**: 18時間（2.25人日）

### 4.2 リスクと対策

| リスク | 影響度 | 対策 |
|--------|------|------|
| WebResearchServiceの応答遅延 | 高 | 非同期処理 + キャッシュ強化 |
| 数値データ抽出の精度 | 中 | 正規表現パターンの充実 |
| コンプライアンス情報の正確性 | 高 | 公式ソース優先 + 手動検証 |
| パフォーマンス劣化 | 中 | インデックス追加 + クエリ最適化 |

## 5. テスト戦略

### 5.1 単体テスト

各UseCaseに対して以下をテスト：
- 正常系：各フィルターパターン
- 異常系：必須パラメータ欠落、無効な値
- エッジケース：空の結果、大量データ
- モック：外部サービスの応答

### 5.2 統合テスト

```typescript
// ai-agent-week8-9.e2e-spec.ts に追加

describe('Week 8-9 Web Research Features', () => {
  describe('/api/ai-agent/research/compliance', () => {
    it('should return compliance requirements for healthcare industry');
    it('should require industry filter');
    it('should cache results for 7 days');
  });
  
  describe('/api/ai-agent/research/benchmarks', () => {
    it('should return process benchmarks with percentile data');
    it('should filter by company size');
    it('should calculate confidence scores');
  });
});
```

## 6. 実装チェックリスト

### SearchComplianceRequirementsUseCase
- [ ] DTOファイル作成
- [ ] UseCaseクラス実装
- [ ] 入力バリデーション
- [ ] 規制データベース検索
- [ ] Web検索統合
- [ ] 情報検証処理
- [ ] 重要度ランキング
- [ ] 単体テスト（カバレッジ90%以上）
- [ ] 統合テスト

### SearchProcessBenchmarksUseCase
- [ ] DTOファイル作成
- [ ] UseCaseクラス実装
- [ ] 入力バリデーション
- [ ] ベンチマークDB検索
- [ ] 数値データ抽出
- [ ] 統計処理（パーセンタイル）
- [ ] 信頼度計算
- [ ] 単体テスト（カバレッジ90%以上）
- [ ] 統合テスト

### コントローラー統合
- [ ] コントローラーメソッド追加
- [ ] 依存性注入設定
- [ ] Swaggerドキュメント
- [ ] エンドポイントテスト
- [ ] ai-agent.module.ts更新

## 7. まとめ

Week 8-9の未実装機能は、Web検索・リサーチ機能の中核となる2つのUseCaseです。

**SearchComplianceRequirementsUseCase**は規制要件に特化し、公式ソースを重視した正確性の高い情報提供を行います。

**SearchProcessBenchmarksUseCase**は数値データの抽出と統計処理により、定量的なベンチマーク情報を提供します。

両機能とも既存のSearchBestPracticesUseCaseをベースに実装可能ですが、それぞれ特有の処理（規制情報の検証、数値データの統計処理）が必要です。

実装には約18時間（2.25人日）を要し、特にテストカバレッジ90%以上の達成が品質確保の鍵となります。

---

**レポート作成日時**: 2025年8月27日  
**作成者**: AI Agent開発チーム  
**ステータス**: 分析完了・実装準備完了