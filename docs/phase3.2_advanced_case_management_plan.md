# Phase 3.2: 高度な案件管理 - 詳細実装計画書

## 1. エグゼクティブサマリー

### 1.1 目的
プロセス管理システムを単一案件管理から複数案件の統合管理プラットフォームへと進化させ、エンタープライズレベルのプロジェクトポートフォリオ管理（PPM）機能を実装する。

### 1.2 ビジネス価値
- **生産性向上**: リソースの最適配分により20-30%の効率改善
- **可視性向上**: 複数案件の統合ダッシュボードによる意思決定の迅速化
- **リスク低減**: ボトルネック早期発見と予防的対策の実施
- **ROI改善**: リソース稼働率の最適化による投資対効果の向上

### 1.3 主要成果物
1. ポートフォリオ管理機能
2. リソース管理・配分システム
3. 高度な分析・レポート機能
4. 複数案件間の依存関係管理

## 2. 機能要件詳細

### 2.1 ポートフォリオ管理

#### 2.1.1 ポートフォリオの概念
```
Portfolio (ポートフォリオ)
├── Project A (プロジェクト)
│   ├── Case 1: 営業案件A-1
│   ├── Case 2: 営業案件A-2
│   └── Case 3: 営業案件A-3
├── Project B
│   ├── Case 4: 開発案件B-1
│   └── Case 5: 開発案件B-2
└── Standalone Cases (独立案件)
    └── Case 6: 特別対応案件
```

#### 2.1.2 ポートフォリオ機能仕様
- **作成・編集**: ポートフォリオの新規作成、名称・説明の編集
- **案件割当**: 既存案件のポートフォリオへの追加・削除
- **階層管理**: ポートフォリオ > プロジェクト > 案件の3階層構造
- **権限管理**: ポートフォリオレベルでのアクセス制御
- **テンプレート**: ポートフォリオテンプレートの作成・適用

### 2.2 リソース管理

#### 2.2.1 リソースプロファイル
```typescript
interface ResourceProfile {
  userId: number;
  skills: Skill[];           // スキルセット
  availability: {             // 稼働可能性
    weeklyHours: number;      // 週間稼働時間
    vacations: DateRange[];   // 休暇予定
    allocatedHours: number;   // 既割当時間
  };
  preferences: {              // 優先設定
    projectTypes: string[];   // 希望プロジェクトタイプ
    maxConcurrentCases: number; // 最大同時担当案件数
  };
  performance: {              // パフォーマンス指標
    avgCompletionRate: number; // 平均完了率
    avgLeadTime: number;      // 平均リードタイム
    specialization: string[]; // 専門分野
  };
}
```

#### 2.2.2 リソース配分機能
- **キャパシティプランニング**
  - リソースの稼働率可視化（ヒートマップ）
  - 将来の負荷予測（1ヶ月、3ヶ月、6ヶ月）
  - ボトルネック検出とアラート

- **スキルベースアサインメント**
  - 必要スキルと利用可能リソースのマッチング
  - スキルギャップ分析
  - 代替リソース提案

- **ワークロードバランシング**
  - 自動負荷分散アルゴリズム
  - 手動調整インターフェース
  - What-ifシミュレーション

### 2.3 高度な分析機能

#### 2.3.1 ポートフォリオダッシュボード
```typescript
interface PortfolioDashboard {
  overview: {
    totalCases: number;
    activeProjects: number;
    totalResources: number;
    overallHealth: 'green' | 'yellow' | 'red';
  };
  
  metrics: {
    schedulePerformance: {
      onTime: number;      // 期限内完了率
      delayed: number;      // 遅延率
      atRisk: number;      // リスク案件率
    };
    resourceUtilization: {
      average: number;      // 平均稼働率
      peak: number;        // ピーク稼働率
      underutilized: User[]; // 低稼働リソース
      overallocated: User[]; // 過負荷リソース
    };
    financials: {
      budgetUtilization: number;
      estimatedROI: number;
      costPerCase: number;
    };
  };
  
  trends: {
    velocityTrend: DataPoint[];      // 速度トレンド
    qualityTrend: DataPoint[];       // 品質トレンド
    satisfactionTrend: DataPoint[];  // 満足度トレンド
  };
}
```

#### 2.3.2 予測分析
- **完了予測**: 機械学習による案件完了日予測
- **リスクスコアリング**: 遅延リスクの定量評価
- **最適経路分析**: クリティカルパス最適化
- **What-ifシナリオ**: リソース変更による影響分析

### 2.4 依存関係管理

#### 2.4.1 依存関係タイプ
```typescript
enum DependencyType {
  FINISH_TO_START = 'FS',    // 前工程完了後に開始
  START_TO_START = 'SS',      // 同時開始
  FINISH_TO_FINISH = 'FF',    // 同時完了
  START_TO_FINISH = 'SF',     // 開始により完了
  RESOURCE_CONFLICT = 'RC',   // リソース競合
  MILESTONE = 'MS'            // マイルストーン依存
}

interface CrossCaseDependency {
  sourceCaseId: number;
  sourceStepId: number;
  targetCaseId: number;
  targetStepId: number;
  type: DependencyType;
  lagTime: number;            // ラグタイム（日数）
  isCritical: boolean;        // クリティカルパス上か
  impactScore: number;        // 影響度スコア
}
```

#### 2.4.2 依存関係機能
- **視覚化**: ネットワーク図での依存関係表示
- **影響分析**: 変更による波及効果の可視化
- **競合検出**: リソース競合の自動検出
- **最適化提案**: 依存関係の簡素化提案

## 3. 技術仕様

### 3.1 データベース設計

#### 3.1.1 新規テーブル

```sql
-- ポートフォリオ管理
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INT REFERENCES users(id),
    organization_id INT REFERENCES organizations(id),
    status VARCHAR(50) DEFAULT 'active',
    budget DECIMAL(15,2),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- プロジェクト（ポートフォリオ内のグループ）
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    manager_id INT REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 案件とプロジェクトの関連
CREATE TABLE project_cases (
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    case_id INT REFERENCES cases(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT REFERENCES users(id),
    PRIMARY KEY(project_id, case_id)
);

-- リソース配分
CREATE TABLE resource_allocations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    case_id INT REFERENCES cases(id),
    project_id INT REFERENCES projects(id),
    role VARCHAR(100),
    allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    start_date DATE NOT NULL,
    end_date DATE,
    skills_required JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT allocation_date_check CHECK (end_date IS NULL OR end_date >= start_date)
);

-- リソーススキル
CREATE TABLE user_skills (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    certified BOOLEAN DEFAULT false,
    years_experience DECIMAL(3,1),
    last_used_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- 案件間依存関係
CREATE TABLE cross_case_dependencies (
    id SERIAL PRIMARY KEY,
    source_case_id INT REFERENCES cases(id) ON DELETE CASCADE,
    source_step_id INT REFERENCES step_instances(id),
    target_case_id INT REFERENCES cases(id) ON DELETE CASCADE,
    target_step_id INT REFERENCES step_instances(id),
    dependency_type VARCHAR(10) NOT NULL,
    lag_days INT DEFAULT 0,
    is_critical BOOLEAN DEFAULT false,
    impact_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

-- リソース稼働カレンダー
CREATE TABLE resource_calendars (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_hours DECIMAL(3,1) DEFAULT 8.0,
    is_holiday BOOLEAN DEFAULT false,
    is_vacation BOOLEAN DEFAULT false,
    notes TEXT,
    UNIQUE(user_id, date)
);

-- ポートフォリオメトリクス（集計テーブル）
CREATE TABLE portfolio_metrics (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolios(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_cases INT,
    active_cases INT,
    completed_cases INT,
    on_time_rate DECIMAL(5,2),
    resource_utilization DECIMAL(5,2),
    budget_utilization DECIMAL(5,2),
    risk_score DECIMAL(5,2),
    velocity DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, metric_date)
);

-- インデックス作成
CREATE INDEX idx_resource_allocations_user ON resource_allocations(user_id);
CREATE INDEX idx_resource_allocations_case ON resource_allocations(case_id);
CREATE INDEX idx_resource_allocations_dates ON resource_allocations(start_date, end_date);
CREATE INDEX idx_cross_case_deps_source ON cross_case_dependencies(source_case_id);
CREATE INDEX idx_cross_case_deps_target ON cross_case_dependencies(target_case_id);
CREATE INDEX idx_portfolio_metrics_date ON portfolio_metrics(portfolio_id, metric_date DESC);
```

#### 3.1.2 既存テーブルの拡張

```sql
-- cases テーブルの拡張
ALTER TABLE cases 
ADD COLUMN priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN category VARCHAR(100),
ADD COLUMN tags JSONB DEFAULT '[]',
ADD COLUMN estimated_hours DECIMAL(6,1),
ADD COLUMN actual_hours DECIMAL(6,1),
ADD COLUMN health_status VARCHAR(20) DEFAULT 'green',
ADD COLUMN risk_factors JSONB DEFAULT '[]',
ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- users テーブルの拡張
ALTER TABLE users
ADD COLUMN weekly_capacity_hours DECIMAL(3,1) DEFAULT 40.0,
ADD COLUMN cost_per_hour DECIMAL(10,2),
ADD COLUMN department VARCHAR(100),
ADD COLUMN manager_id INT REFERENCES users(id),
ADD COLUMN employment_type VARCHAR(50) DEFAULT 'full_time';

-- step_instances テーブルの拡張
ALTER TABLE step_instances
ADD COLUMN estimated_hours DECIMAL(5,1),
ADD COLUMN actual_hours DECIMAL(5,1),
ADD COLUMN completion_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN blocked_reason TEXT,
ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
```

### 3.2 API設計

#### 3.2.1 ポートフォリオAPI

```typescript
// ポートフォリオエンドポイント
@Controller('api/portfolios')
export class PortfolioController {
  
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: PortfolioQueryDto): Promise<Portfolio[]>
  
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number): Promise<PortfolioDetailDto>
  
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('portfolio_manager', 'admin')
  async create(@Body() dto: CreatePortfolioDto): Promise<Portfolio>
  
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('portfolio_manager', 'admin')
  async update(@Param('id') id: number, @Body() dto: UpdatePortfolioDto): Promise<Portfolio>
  
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: number): Promise<void>
  
  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard)
  async getMetrics(@Param('id') id: number, @Query() query: MetricsQueryDto): Promise<PortfolioMetrics>
  
  @Get(':id/health')
  @UseGuards(JwtAuthGuard)
  async getHealthScore(@Param('id') id: number): Promise<HealthScoreDto>
  
  @Post(':id/cases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('portfolio_manager', 'case_coordinator')
  async addCase(@Param('id') id: number, @Body() dto: AddCaseDto): Promise<void>
  
  @Delete(':id/cases/:caseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('portfolio_manager', 'case_coordinator')
  async removeCase(@Param('id') id: number, @Param('caseId') caseId: number): Promise<void>
}
```

#### 3.2.2 リソース管理API

```typescript
// リソース管理エンドポイント
@Controller('api/resources')
export class ResourceController {
  
  @Get('availability')
  @UseGuards(JwtAuthGuard)
  async getAvailability(@Query() query: AvailabilityQueryDto): Promise<ResourceAvailability[]>
  
  @Get('allocation-matrix')
  @UseGuards(JwtAuthGuard)
  async getAllocationMatrix(@Query() query: DateRangeDto): Promise<AllocationMatrix>
  
  @Post('allocate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('resource_manager', 'portfolio_manager')
  async allocateResource(@Body() dto: AllocateResourceDto): Promise<ResourceAllocation>
  
  @Put('allocations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('resource_manager', 'portfolio_manager')
  async updateAllocation(@Param('id') id: number, @Body() dto: UpdateAllocationDto): Promise<ResourceAllocation>
  
  @Delete('allocations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('resource_manager', 'portfolio_manager')
  async deallocate(@Param('id') id: number): Promise<void>
  
  @Get('conflicts')
  @UseGuards(JwtAuthGuard)
  async detectConflicts(@Query() query: ConflictQueryDto): Promise<ResourceConflict[]>
  
  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(@Query() query: RecommendationQueryDto): Promise<ResourceRecommendation[]>
  
  @Post('optimize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('resource_manager')
  async optimizeAllocations(@Body() dto: OptimizationDto): Promise<OptimizationResult>
}
```

#### 3.2.3 分析API

```typescript
// 高度な分析エンドポイント
@Controller('api/analytics')
export class AnalyticsController {
  
  @Get('portfolio/:id/dashboard')
  @UseGuards(JwtAuthGuard)
  async getPortfolioDashboard(@Param('id') id: number): Promise<PortfolioDashboard>
  
  @Get('predictions/completion')
  @UseGuards(JwtAuthGuard)
  async predictCompletion(@Query() query: PredictionQueryDto): Promise<CompletionPrediction[]>
  
  @Get('risks/assessment')
  @UseGuards(JwtAuthGuard)
  async assessRisks(@Query() query: RiskQueryDto): Promise<RiskAssessment[]>
  
  @Get('bottlenecks')
  @UseGuards(JwtAuthGuard)
  async detectBottlenecks(@Query() query: BottleneckQueryDto): Promise<Bottleneck[]>
  
  @Get('trends')
  @UseGuards(JwtAuthGuard)
  async getTrends(@Query() query: TrendQueryDto): Promise<TrendAnalysis>
  
  @Post('whatif')
  @UseGuards(JwtAuthGuard)
  async runWhatIfScenario(@Body() dto: WhatIfScenarioDto): Promise<ScenarioResult>
  
  @Get('reports/generate')
  @UseGuards(JwtAuthGuard)
  async generateReport(@Query() query: ReportQueryDto): Promise<GeneratedReport>
}
```

### 3.3 フロントエンド設計

#### 3.3.1 コンポーネント構造

```typescript
// ポートフォリオ管理コンポーネント
app/
├── portfolios/
│   ├── page.tsx                    // ポートフォリオ一覧
│   ├── [id]/
│   │   ├── page.tsx                // ポートフォリオ詳細
│   │   ├── dashboard/
│   │   │   └── page.tsx            // ダッシュボード
│   │   ├── cases/
│   │   │   └── page.tsx            // 案件管理
│   │   ├── resources/
│   │   │   └── page.tsx            // リソース管理
│   │   └── analytics/
│   │       └── page.tsx            // 分析
│   └── components/
│       ├── PortfolioCard.tsx
│       ├── PortfolioMetrics.tsx
│       ├── PortfolioTimeline.tsx
│       └── PortfolioHealth.tsx
├── resources/
│   ├── page.tsx                    // リソース一覧
│   ├── allocation/
│   │   └── page.tsx                // 配分管理
│   ├── capacity/
│   │   └── page.tsx                // キャパシティ
│   └── components/
│       ├── ResourceMatrix.tsx
│       ├── AllocationCalendar.tsx
│       ├── SkillMatrix.tsx
│       └── WorkloadChart.tsx
└── analytics/
    ├── page.tsx                    // 分析ダッシュボード
    ├── predictions/
    │   └── page.tsx                // 予測分析
    ├── risks/
    │   └── page.tsx                // リスク分析
    └── components/
        ├── PredictiveChart.tsx
        ├── RiskHeatmap.tsx
        ├── BottleneckDiagram.tsx
        └── WhatIfSimulator.tsx
```

#### 3.3.2 状態管理

```typescript
// Zustandストア設計
interface PortfolioStore {
  // State
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  portfolioMetrics: PortfolioMetrics | null;
  resourceAllocations: ResourceAllocation[];
  
  // Actions
  fetchPortfolios: () => Promise<void>;
  selectPortfolio: (id: number) => Promise<void>;
  createPortfolio: (data: CreatePortfolioDto) => Promise<Portfolio>;
  updatePortfolio: (id: number, data: UpdatePortfolioDto) => Promise<void>;
  deletePortfolio: (id: number) => Promise<void>;
  
  // Resource Management
  allocateResource: (data: AllocateResourceDto) => Promise<void>;
  deallocateResource: (allocationId: number) => Promise<void>;
  optimizeAllocations: (portfolioId: number) => Promise<OptimizationResult>;
  
  // Analytics
  fetchMetrics: (portfolioId: number) => Promise<void>;
  runPrediction: (params: PredictionParams) => Promise<PredictionResult>;
  runWhatIf: (scenario: WhatIfScenario) => Promise<ScenarioResult>;
}
```

### 3.4 パフォーマンス最適化

#### 3.4.1 データベース最適化

```sql
-- マテリアライズドビュー for 高速集計
CREATE MATERIALIZED VIEW mv_portfolio_summary AS
SELECT 
    p.id as portfolio_id,
    p.name as portfolio_name,
    COUNT(DISTINCT pc.case_id) as total_cases,
    COUNT(DISTINCT CASE WHEN c.status IN ('open', 'in_progress') THEN c.id END) as active_cases,
    AVG(CASE WHEN si.status = 'done' THEN 1 ELSE 0 END) * 100 as completion_rate,
    COUNT(DISTINCT ra.user_id) as total_resources,
    AVG(ra.allocation_percentage) as avg_allocation
FROM portfolios p
LEFT JOIN projects pr ON pr.portfolio_id = p.id
LEFT JOIN project_cases pc ON pc.project_id = pr.id
LEFT JOIN cases c ON c.id = pc.case_id
LEFT JOIN step_instances si ON si.case_id = c.id
LEFT JOIN resource_allocations ra ON ra.case_id = c.id
GROUP BY p.id, p.name;

-- リフレッシュ設定
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_portfolio_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON cases
FOR EACH STATEMENT EXECUTE FUNCTION refresh_portfolio_summary();
```

#### 3.4.2 キャッシング戦略

```typescript
// Redis キャッシング
class CacheService {
  private readonly TTL = {
    PORTFOLIO_METRICS: 300,      // 5分
    RESOURCE_AVAILABILITY: 600,  // 10分
    PREDICTIONS: 3600,           // 1時間
    STATIC_REPORTS: 86400        // 24時間
  };
  
  async getPortfolioMetrics(portfolioId: number): Promise<PortfolioMetrics | null> {
    const key = `portfolio:${portfolioId}:metrics`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const metrics = await this.calculateMetrics(portfolioId);
    await this.redis.setex(key, this.TTL.PORTFOLIO_METRICS, JSON.stringify(metrics));
    return metrics;
  }
  
  async invalidatePortfolioCache(portfolioId: number): Promise<void> {
    const pattern = `portfolio:${portfolioId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## 4. 実装計画

### 4.1 フェーズ分割

#### Phase 3.2.1: 基盤構築（Week 1-2）
- [ ] データベーススキーマ作成
- [ ] 基本エンティティ実装
- [ ] リポジトリ層実装
- [ ] 基本API実装

#### Phase 3.2.2: ポートフォリオ管理（Week 3-4）
- [ ] ポートフォリオCRUD機能
- [ ] プロジェクト管理機能
- [ ] 案件グルーピング機能
- [ ] ポートフォリオダッシュボード

#### Phase 3.2.3: リソース管理（Week 5-6）
- [ ] リソースプロファイル管理
- [ ] 配分管理機能
- [ ] キャパシティプランニング
- [ ] スキルマッチング

#### Phase 3.2.4: 高度な分析（Week 7-8）
- [ ] 予測分析実装
- [ ] リスク評価機能
- [ ] ボトルネック検出
- [ ] What-ifシミュレーター

#### Phase 3.2.5: 統合・最適化（Week 9-10）
- [ ] パフォーマンス最適化
- [ ] UI/UX改善
- [ ] テスト・バグ修正
- [ ] ドキュメント作成

### 4.2 技術的マイルストーン

| マイルストーン | 期限 | 成功基準 |
|------------|------|---------|
| M1: データベース基盤 | Week 2 | 全テーブル作成、マイグレーション完了 |
| M2: 基本API稼働 | Week 4 | ポートフォリオCRUD API稼働 |
| M3: リソース管理MVP | Week 6 | リソース配分機能の基本動作 |
| M4: 分析機能稼働 | Week 8 | 予測・リスク分析の実装 |
| M5: 本番リリース | Week 10 | 全機能統合、パフォーマンステスト合格 |

### 4.3 リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|-------|-------|---------|------|
| パフォーマンス劣化 | 高 | 中 | 段階的な最適化、キャッシング実装 |
| 複雑な権限管理 | 中 | 高 | RBAC拡張、テスト強化 |
| UIの複雑化 | 中 | 中 | プログレッシブディスクロージャー採用 |
| データ整合性 | 高 | 低 | トランザクション管理、監査ログ |

## 5. テスト計画

### 5.1 単体テスト
- エンティティロジックテスト
- サービス層テスト
- コントローラーテスト
- カバレッジ目標: 80%以上

### 5.2 統合テスト
- API統合テスト
- データベーストランザクションテスト
- 権限統合テスト

### 5.3 E2Eテスト
- ポートフォリオ作成フロー
- リソース配分フロー
- 分析レポート生成フロー

### 5.4 パフォーマンステスト
- 1000案件、100リソースでの応答速度
- 同時アクセス100ユーザー
- 目標応答時間: 95%ile < 2秒

## 6. 成功指標

### 6.1 技術的KPI
- API応答時間: 平均 < 500ms
- ページロード時間: < 3秒
- システム稼働率: > 99.9%
- バグ密度: < 1件/KLOC

### 6.2 ビジネスKPI
- リソース稼働率改善: +20%
- 案件遅延率削減: -30%
- ユーザー満足度: > 4.0/5.0
- ROI: 6ヶ月で投資回収

## 7. 依存関係と前提条件

### 7.1 依存関係
- Phase 3.1（認証・認可）の完了
- PostgreSQL 14以上
- Redis 6.0以上
- Node.js 18以上

### 7.2 前提条件
- 既存データの移行計画策定済み
- ユーザートレーニング計画策定済み
- 本番環境のスケーラビリティ確保

## 8. 移行計画

### 8.1 データ移行
1. 既存案件データのバックアップ
2. ポートフォリオ構造への変換スクリプト実行
3. リソース情報の初期設定
4. 検証とロールバック計画

### 8.2 段階的ロールアウト
1. **Phase A**: 内部チームでのベータテスト（2週間）
2. **Phase B**: 選定顧客でのパイロット運用（4週間）
3. **Phase C**: 全ユーザーへの展開（2週間）

## 9. 付録

### 9.1 用語集
- **ポートフォリオ**: 複数の案件を束ねた管理単位
- **リソース**: プロジェクトに割り当て可能な人的資源
- **アロケーション**: リソースの案件への割り当て
- **キャパシティ**: リソースの利用可能時間
- **ボトルネック**: プロジェクト進行の制約要因

### 9.2 参考資料
- PMBOKガイド第7版
- アジャイルポートフォリオ管理
- リソース最適化アルゴリズム論文

---

*このドキュメントは継続的に更新され、実装の進捗に応じて詳細化されます。*