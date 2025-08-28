# 統合テストCACHE_MANAGER問題の詳細分析レポート

## 問題の概要
統合テストで`AICacheService`の依存性注入に失敗している。エラーメッセージ：
```
Nest can't resolve dependencies of the AICacheService (?, ConfigService, CacheKeyGenerator). 
Please make sure that the argument "CACHE_MANAGER" at index [0] is available
```

## 根本原因

### 1. 依存関係の構造
```
AppModule
  └── AIAgentModule
       └── AICacheModule (src/infrastructure/cache/cache.module.ts)
            └── CacheModule.registerAsync() (@nestjs/cache-manager)
                 └── CACHE_MANAGER token を自動提供
```

### 2. AICacheServiceの依存関係
```typescript
// ai-cache.service.ts
constructor(
  @Inject('CACHE_MANAGER') private cacheManager: Cache,  // ここで注入
  private readonly configService: ConfigService,
  private readonly keyGenerator: CacheKeyGenerator,
)
```

### 3. 現在のモック戦略の問題点

#### 問題1: jest.mockの不完全な実装
```typescript
jest.mock('@nestjs/cache-manager', () => ({
  CacheModule: {
    registerAsync: jest.fn(() => ({
      module: class MockCacheModule {},
      providers: [],  // ← CACHE_MANAGERプロバイダーが含まれていない！
      exports: [],    // ← CACHE_MANAGERトークンがエクスポートされていない！
    })),
  },
}));
```

#### 問題2: overrideProviderの位置とタイミング
```typescript
.overrideProvider('CACHE_MANAGER')  // ← .compile()の前だが、効果がない
.useValue({...})
```

モックされたCacheModuleが`CACHE_MANAGER`トークンを提供していないため、overrideProviderが効かない。

## 詳細な技術的分析

### NestJSの@nestjs/cache-managerの動作
1. `CacheModule.registerAsync()`は内部で`CACHE_MANAGER`トークンのプロバイダーを作成
2. このトークンはCacheインスタンスを提供
3. モジュールは自動的にこのトークンをエクスポート

### 現在のモックが失敗する理由
1. jest.mockがCacheModule全体を置き換えている
2. モックされたモジュールは空のproviders/exportsを返している
3. AICacheModuleがCacheModuleをインポートしても、CACHE_MANAGERトークンが存在しない
4. overrideProviderは存在しないプロバイダーをオーバーライドできない

## 修正方法

### 方法1: jest.mockを修正（推奨）
```typescript
jest.mock('@nestjs/cache-manager', () => ({
  CacheModule: {
    registerAsync: jest.fn(() => ({
      module: class MockCacheModule {},
      providers: [
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
            del: jest.fn().mockResolvedValue(1),
            reset: jest.fn().mockResolvedValue(true),
            wrap: jest.fn().mockImplementation(async (key, fn) => fn()),
            store: {
              keys: jest.fn().mockResolvedValue([]),
              ttl: jest.fn().mockResolvedValue(-1),
            },
          },
        },
      ],
      exports: ['CACHE_MANAGER'],  // 重要：トークンのエクスポート
    })),
  },
}));
```

### 方法2: AICacheServiceを直接モック（代替案）
```typescript
.overrideProvider(AICacheService)
.useValue({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  // ... 他のメソッド
})
```

### 方法3: カスタムプロバイダーの追加（別の代替案）
```typescript
.overrideModule(AICacheModule)
.useModule(class MockAICacheModule {
  static register() {
    return {
      module: MockAICacheModule,
      providers: [
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
        AICacheService,
        CacheKeyGenerator,
      ],
      exports: [AICacheService],
    };
  }
})
```

## 修正対象ファイル

以下の3ファイルすべてに同じ修正を適用：
1. `/api/src/interfaces/controllers/comment/comment.controller.integration.spec.ts`
2. `/api/src/interfaces/controllers/kanban/kanban.controller.integration.spec.ts`
3. `/api/src/interfaces/controllers/step/step.controller.integration.spec.ts`

## 推奨される修正内容

各ファイルのjest.mockブロックを以下のように変更：

```typescript
// Mock CacheModule before any imports
jest.mock('@nestjs/cache-manager', () => ({
  CacheModule: {
    registerAsync: jest.fn(() => ({
      module: class MockCacheModule {},
      providers: [
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
            del: jest.fn().mockResolvedValue(1),
            reset: jest.fn().mockResolvedValue(true),
            wrap: jest.fn().mockImplementation(async (key, fn) => fn()),
            store: {
              keys: jest.fn().mockResolvedValue([]),
              ttl: jest.fn().mockResolvedValue(-1),
            },
          },
        },
      ],
      exports: ['CACHE_MANAGER'],
    })),
  },
}));
```

そして、既存の`.overrideProvider('CACHE_MANAGER')`の行を削除（jest.mockで既に提供されているため不要）。

## リスク評価

- **リスクレベル**: 低
- **影響範囲**: テストのみ（本番コードには影響なし）
- **テスト済みの方法**: jest.mockは一般的なパターン
- **副作用**: なし

## 期待される結果

修正後、以下の改善が期待される：
1. 統合テストの`CACHE_MANAGER`依存性エラーが解決
2. 3つの統合テストスイートが正常に実行される
3. 関連する約20-30のテストが成功する

## 結論

問題の根本原因は、jest.mockでCacheModuleをモックする際に、`CACHE_MANAGER`トークンのプロバイダーとエクスポートを含めていなかったことです。この修正により、NestJSの依存性注入システムが正しく動作するようになります。