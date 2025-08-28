# InterviewSessionRepository依存性問題の詳細分析レポート

## 問題の概要

統合テストで以下のエラーが発生：
```
Nest can't resolve dependencies of the StartInterviewSessionUseCase 
(?, AIConversationService, AIConfigService, AIRateLimitService, AICacheService, SocketGateway). 
Please make sure that the argument "InterviewSessionRepository" at index [0] is available
```

## 根本原因

**`InterviewSessionRepository`のプロバイダーが`InfrastructureModule`に登録されていない**

## 詳細な技術分析

### 1. 依存関係の構造

```
AppModule
  └── AIAgentModule
       ├── imports: [InfrastructureModule, DomainModule, ...]
       └── providers: [StartInterviewSessionUseCase, ...]
            └── StartInterviewSessionUseCase
                 └── @Inject('InterviewSessionRepository') // ← ここで注入を期待
```

### 2. 現在の状況

#### InfrastructureModule (infrastructure.module.ts)
```typescript
const repositories = [
  ProcessTemplateRepository,
  CaseRepository,
  StepInstanceRepository,
  HolidayRepository,
  UserRepository,
  ArtifactRepository,
  CommentRepository,
  NotificationRepository,
  // ❌ PrismaInterviewSessionRepository が欠落！
  // ❌ PrismaProcessKnowledgeRepository も欠落！
  // ❌ PrismaWebResearchCacheRepository も欠落！
];
```

#### 存在するが登録されていないリポジトリ

1. **PrismaInterviewSessionRepository**
   - ファイル: `infrastructure/repositories/prisma-interview-session.repository.ts`
   - インターフェース: `InterviewSessionRepository`
   - 使用箇所: 全AIAgentのUseCase（12箇所）

2. **PrismaProcessKnowledgeRepository** 
   - ファイル: `infrastructure/repositories/prisma-process-knowledge.repository.ts`
   - インターフェース: `ProcessKnowledgeRepository`
   - 使用箇所: Search系のUseCase（5箇所）

3. **PrismaWebResearchCacheRepository**
   - ファイル: `infrastructure/repositories/prisma-web-research-cache.repository.ts`
   - インターフェース: `WebResearchCacheRepository`
   - 使用箇所: Search系のUseCase（4箇所）

### 3. なぜこの問題が今まで発見されなかったか

1. **単体テスト**: モックを直接提供しているため問題なし
   ```typescript
   providers: [
     {
       provide: 'InterviewSessionRepository',
       useValue: { /* mock */ }
     }
   ]
   ```

2. **CACHE_MANAGER問題がマスクしていた**: 
   - 以前はCACHE_MANAGERエラーで初期化が失敗
   - CACHE_MANAGER修正後、次の依存性チェックまで進むようになった

3. **開発順序**:
   - AIAgent機能は後から追加された（Week 8-9）
   - InfrastructureModuleへの登録が漏れた

### 4. 影響範囲

#### 直接影響を受けるUseCase
- StartInterviewSessionUseCase
- GetInterviewSessionUseCase  
- EndInterviewSessionUseCase
- ProcessUserMessageUseCase
- GetConversationHistoryUseCase
- CleanupExpiredSessionsUseCase
- CollectUserFeedbackUseCase
- GenerateTemplateRecommendationsUseCase
- FinalizeTemplateCreationUseCase

#### 追加で影響を受ける可能性があるUseCase
- SearchBestPracticesUseCase (ProcessKnowledgeRepository)
- SearchComplianceRequirementsUseCase (ProcessKnowledgeRepository, WebResearchCacheRepository)
- SearchProcessBenchmarksUseCase (ProcessKnowledgeRepository, WebResearchCacheRepository)

## 修正方法

### Option 1: InfrastructureModuleに追加（推奨）

```typescript
// infrastructure.module.ts
import { PrismaInterviewSessionRepository } from './repositories/prisma-interview-session.repository';
import { PrismaProcessKnowledgeRepository } from './repositories/prisma-process-knowledge.repository';
import { PrismaWebResearchCacheRepository } from './repositories/prisma-web-research-cache.repository';

const repositories = [
  // ... 既存のリポジトリ
  PrismaInterviewSessionRepository,
  PrismaProcessKnowledgeRepository,
  PrismaWebResearchCacheRepository,
  {
    provide: 'InterviewSessionRepository',
    useClass: PrismaInterviewSessionRepository,
  },
  {
    provide: 'ProcessKnowledgeRepository',
    useClass: PrismaProcessKnowledgeRepository,
  },
  {
    provide: 'WebResearchCacheRepository',
    useClass: PrismaWebResearchCacheRepository,
  },
];

// exportsにも追加
exports: [
  ...repositories,
  // ... 既存のエクスポート
]
```

### Option 2: 統合テストでモック（代替案）

```typescript
// 各統合テストファイル
.overrideProvider('InterviewSessionRepository')
.useValue({
  save: jest.fn(),
  findById: jest.fn(),
  // ... 必要なメソッド
})
.overrideProvider('ProcessKnowledgeRepository')
.useValue({
  findByQuery: jest.fn(),
  // ... 必要なメソッド
})
.overrideProvider('WebResearchCacheRepository')
.useValue({
  findCachedResults: jest.fn(),
  saveCachedResults: jest.fn(),
  // ... 必要なメソッド
})
```

## リスク評価

### Option 1のリスク
- **リスクレベル**: 低
- **メリット**: 
  - 根本的な解決
  - 本番環境でも正しく動作
  - 将来の統合テストでも問題なし
- **デメリット**:
  - 3つのリポジトリクラスが実際に存在し、正しく実装されている必要がある

### Option 2のリスク
- **リスクレベル**: 中
- **メリット**:
  - テストのみの修正で済む
  - 本番コードに影響なし
- **デメリット**:
  - 根本問題が未解決
  - 各統合テストファイルで同じモックが必要
  - 本番環境で同じ問題が発生する可能性

## 推奨事項

### 即時対応（Option 1を推奨）

1. **InfrastructureModuleへの追加**
   - PrismaInterviewSessionRepository
   - PrismaProcessKnowledgeRepository  
   - PrismaWebResearchCacheRepository

2. **確認事項**
   - 各リポジトリクラスが存在することを確認
   - PrismaServiceが注入可能であることを確認

3. **テスト**
   - 統合テストの実行
   - 単体テストへの影響がないことを確認

### 長期的対応

1. **モジュール構造の見直し**
   - AI関連のリポジトリを別モジュールに分離することを検討
   - `AIInfrastructureModule`の作成

2. **自動検証**
   - 依存性注入の自動テスト追加
   - モジュール登録漏れを検出する仕組み

## 結論

問題の根本原因は、AIAgent関連の3つのリポジトリが`InfrastructureModule`に登録されていないことです。これらのリポジトリクラス自体は存在し、`@Injectable()`デコレータも付与されていますが、モジュールのプロバイダーとして登録されていないため、NestJSの依存性注入システムが解決できません。

Option 1（InfrastructureModuleへの追加）による修正を推奨します。これにより、統合テストの30個のテスト失敗が解決される見込みです。