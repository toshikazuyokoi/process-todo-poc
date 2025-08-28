# 高優先度問題の詳細分析と修正計画

## 1. AIAgentControllerテストの依存性注入問題

### 問題の詳細
AIAgentControllerのコンストラクタに11個のUseCaseが注入されているが、テストファイルには9個しかモック設定されていない。

### 欠けている2つのUseCase
- **SearchComplianceRequirementsUseCase** (index 9)
- **SearchProcessBenchmarksUseCase** (index 10)

### 修正対象ファイル
`/api/src/interfaces/controllers/__tests__/ai-agent.controller.spec.ts`

### 具体的な修正内容
行90の後に以下を追加：
```typescript
{
  provide: SearchComplianceRequirementsUseCase,
  useValue: {
    execute: jest.fn(),
  },
},
{
  provide: SearchProcessBenchmarksUseCase,
  useValue: {
    execute: jest.fn(),
  },
},
```

また、行12の後にimport文を追加：
```typescript
import { SearchComplianceRequirementsUseCase } from '../../../application/usecases/ai-agent/search-compliance-requirements.usecase';
import { SearchProcessBenchmarksUseCase } from '../../../application/usecases/ai-agent/search-process-benchmarks.usecase';
```

## 2. 統合テストのCACHE_MANAGER問題

### 問題の詳細
AICacheServiceは`@Inject('CACHE_MANAGER')`でキャッシュマネージャーを注入しているが、AICacheModuleは`CacheModule.registerAsync`を使用してキャッシュを設定している。NestJSの`@nestjs/cache-manager`は自動的に`CACHE_MANAGER`トークンを提供するはずだが、テスト環境では正しく機能していない。

### 根本原因
1. `CacheModule`がrequire文で動的にインポートされている（行7）
2. redisStoreが非同期で初期化される（行16）
3. テスト環境でRedis接続が確立できない

### 修正対象ファイル
以下の統合テストファイル：
- `/api/src/interfaces/controllers/kanban/kanban.controller.integration.spec.ts`
- `/api/src/interfaces/controllers/comment/comment.controller.integration.spec.ts`
- `/api/src/interfaces/controllers/step/step.controller.integration.spec.ts`

### 具体的な修正内容

#### 方法1: CACHE_MANAGERのモックを追加（推奨）
各統合テストファイルの`.overrideProvider`チェーンに追加（行48の後）：
```typescript
.overrideProvider('CACHE_MANAGER')
.useValue({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(1),
  reset: jest.fn().mockResolvedValue(true),
  wrap: jest.fn().mockImplementation(async (key, fn) => fn()),
  store: {
    keys: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(-1),
  },
})
```

#### 方法2: AICacheServiceごとモック（代替案）
```typescript
.overrideProvider(AICacheService)
.useValue({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  cacheConversation: jest.fn().mockResolvedValue(true),
  getCachedConversation: jest.fn().mockResolvedValue(null),
  cacheSession: jest.fn().mockResolvedValue(true),
  getCachedSession: jest.fn().mockResolvedValue(null),
  clearSessionCache: jest.fn().mockResolvedValue(true),
  getStatistics: jest.fn().mockResolvedValue({
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  }),
})
```

## 3. ProcessUserMessageUseCaseの実装問題

### 問題1: monitoringService.logAIRequestが呼ばれていない

#### 原因
行90-94で`logUsage`メソッドを呼んでいるが、このメソッド内（行290-296）では`monitoringService.logUsage`を呼んでいる。
しかし、テストでは`monitoringService.logAIRequest`が呼ばれることを期待している（行180）。

#### 修正案

**Option A: 実装を修正**
行90-94を以下のように変更：
```typescript
// 9. Log usage
await this.monitoringService.logAIRequest(
  input.userId,
  'process_message',
  aiResponse.tokenCount || 0,
  aiResponse.estimatedCost || 0,
);
```

**Option B: テストを修正**
行180を以下のように変更：
```typescript
expect(monitoringService.logUsage).toHaveBeenCalled();
```

### 問題2: 空メッセージのエラーハンドリング

#### 原因
行142-144でメッセージの検証を行い、空の場合は`DomainException`をスローしている。
しかし、行50-52で`handleOpenAIError`がcatchしており、行234-261の処理で`createFallbackResponse`を返してしまう。
これにより、例外がスローされずに正常なレスポンスとして処理される。

#### 修正案
`handleOpenAIError`メソッドがDomainExceptionをキャッチしないようにする。

行50-52を以下のように変更：
```typescript
} catch (error) {
  // DomainExceptionは再スロー
  if (error instanceof DomainException) {
    throw error;
  }
  aiResponse = await this.handleOpenAIError(error, session, input.message);
}
```

もしくは、より明確にexecuteメソッド全体のエラーハンドリングを改善：

行33の前に追加：
```typescript
async execute(input: ProcessMessageInput): Promise<ProcessMessageOutput> {
  try {
    // 1. Validate input (DomainExceptionをスローする可能性)
    this.validateInput(input);
    
    // ... 以降の処理
  } catch (error) {
    // DomainExceptionはそのまま再スロー
    if (error instanceof DomainException) {
      throw error;
    }
    
    // その他のエラーは処理
    // ...
  }
}
```

## 修正優先順位と影響範囲

### 1. 最優先: AIAgentControllerテストの修正
- **影響**: AIAgentControllerの全テスト（5つ以上）
- **難易度**: 低（単純なモック追加）
- **修正時間**: 5分

### 2. 高優先: 統合テストのCACHE_MANAGER修正
- **影響**: 3つの統合テストファイル（kanban、comment、step）
- **難易度**: 中（複数ファイルに同じ修正）
- **修正時間**: 10分

### 3. 中優先: ProcessUserMessageUseCaseの修正
- **影響**: ProcessUserMessageUseCaseのテスト4つ
- **難易度**: 中（ロジックの修正が必要）
- **修正時間**: 15分

## リスクと考慮事項

1. **CACHE_MANAGERの修正**
   - 本番環境では正常に動作している可能性が高い
   - テスト環境のみの問題なので、モックで対応するのが安全

2. **ProcessUserMessageUseCaseの修正**
   - logAIRequestとlogUsageの使い分けを明確にする必要がある
   - エラーハンドリングの修正は慎重に行う必要がある

3. **依存性の順序**
   - AIAgentControllerのコンストラクタ引数の順序が重要
   - 新しいUseCaseは最後に追加されているので、既存のテストへの影響は最小限

## 推奨される実装順序

1. AIAgentControllerテストにSearchComplianceRequirementsUseCaseとSearchProcessBenchmarksUseCaseのモック追加
2. 統合テストファイル3つにCACHE_MANAGERのモック追加
3. ProcessUserMessageUseCaseのlogAIRequest呼び出し修正
4. ProcessUserMessageUseCaseのエラーハンドリング修正

これらの修正により、失敗している50個のテストのうち、約40個が解決される見込みです。