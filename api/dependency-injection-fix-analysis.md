# 依存性注入エラーの詳細分析と修正方針

## 1. CaseController 依存性エラー

### 問題の詳細
```typescript
// case.controller.ts のコンストラクタ
constructor(
  private readonly createCaseUseCase: CreateCaseUseCase,    // ✅ モック済み
  private readonly previewReplanUseCase: PreviewReplanUseCase, // ✅ モック済み
  private readonly applyReplanUseCase: ApplyReplanUseCase,   // ✅ モック済み
  private readonly caseRepository: CaseRepository,           // ✅ モック済み
  private readonly realtimeGateway: RealtimeGateway,        // ❌ モック未設定
)
```

### エラーメッセージ
```
Nest can't resolve dependencies of the CaseController 
(..., ?). Please make sure that the argument RealtimeGateway at index [4] is available
```

### 修正内容
**case.controller.spec.ts の providers配列に追加:**
```typescript
{
  provide: RealtimeGateway,
  useValue: {
    sendCaseUpdate: jest.fn(),
    sendStepUpdate: jest.fn(),
    broadcast: jest.fn(),
  },
}
```

## 2. StepController 依存性エラー

### 問題の詳細
```typescript
// step.controller.ts のコンストラクタ
constructor(
  private readonly getStepByIdUseCase: GetStepByIdUseCase,  // ❌ モック未設定
  private readonly updateStepStatusUseCase: UpdateStepStatusUseCase, // ❌ モック未設定
  private readonly assignStepToUserUseCase: AssignStepToUserUseCase, // ❌ モック未設定
  private readonly lockStepUseCase: LockStepUseCase,        // ❌ モック未設定
  private readonly unlockStepUseCase: UnlockStepUseCase,    // ❌ モック未設定
  private readonly bulkUpdateStepsUseCase: BulkUpdateStepsUseCase,   // ❌ モック未設定
)
```

### 現在のテスト設定（間違い）
```typescript
// step.controller.spec.ts
providers: [
  {
    provide: StepInstanceRepository,  // ❌ 古い依存性（リファクタリング前）
    useValue: { ... },
  },
]
```

### エラーメッセージ
```
Nest can't resolve dependencies of the StepController 
(?,...). Please make sure that the argument GetStepByIdUseCase at index [0] is available
```

### 修正内容
**step.controller.spec.ts の providers配列を完全に置き換え:**
```typescript
providers: [
  {
    provide: GetStepByIdUseCase,
    useValue: { execute: jest.fn() },
  },
  {
    provide: UpdateStepStatusUseCase,
    useValue: { execute: jest.fn() },
  },
  {
    provide: AssignStepToUserUseCase,
    useValue: { execute: jest.fn() },
  },
  {
    provide: LockStepUseCase,
    useValue: { execute: jest.fn() },
  },
  {
    provide: UnlockStepUseCase,
    useValue: { execute: jest.fn() },
  },
  {
    provide: BulkUpdateStepsUseCase,
    useValue: { execute: jest.fn() },
  },
]
```

## 問題の根本原因

### Clean Architectureへのリファクタリング
StepControllerは最近のリファクタリングで、リポジトリ直接依存から UseCase パターンに移行されました：
- **変更前**: StepInstanceRepository を直接注入
- **変更後**: 各操作に対応する UseCase を注入

### WebSocket機能の追加
CaseControllerに RealtimeGateway が追加され、リアルタイム通知機能が実装されました。

## 修正による影響

### CaseController
- 4つのテストが成功するようになる
- RealtimeGatewayのモック関数を適切に設定することで、WebSocket通知のテストも可能

### StepController
- 4つのテストが成功するようになる
- ただし、テストロジックも UseCase パターンに合わせて修正が必要：
  - `controller.bulkUpdate(dto)` の実装が `bulkUpdateStepsUseCase.execute(dto)` を呼ぶように変更されている
  - モックの呼び出し検証も UseCase ベースに変更が必要

## 追加の修正が必要な箇所

### step.controller.spec.ts のテストロジック
現在のテストは古い実装（リポジトリ直接操作）を前提としているため、以下の修正が必要：

1. **モック設定の変更**
   - `stepRepository.findById` → `getStepByIdUseCase.execute`
   - `stepRepository.update` → 各 UseCase の execute メソッド

2. **期待値の検証**
   - リポジトリメソッドの呼び出し → UseCase の execute メソッドの呼び出し

3. **bulkUpdate メソッドの実装確認**
   - 現在の実装が `bulkUpdateStepsUseCase.execute` を適切に呼んでいるか確認