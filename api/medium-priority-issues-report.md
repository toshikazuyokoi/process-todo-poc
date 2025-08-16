# 中優先度問題の詳細分析レポート

## 実行日時
2025年8月16日

## エグゼクティブサマリー
WebSocket通知とテストデータ管理の問題を詳細に分析した結果、以下の根本原因を特定しました：
1. **WebSocket通知問題**: `broadcastStepUpdate`メソッドの呼び出し不一致（パラメータ数の違い）
2. **テストデータ管理問題**: 外部キー制約と初期データの想定違い

---

## 問題1: WebSocket通知が呼ばれない

### 問題の詳細

#### 発生箇所
```typescript
// kanban.controller.integration.spec.ts:285-291
expect(realtimeGateway.broadcastStepUpdate).toHaveBeenCalledWith(
  testCaseId,
  expect.objectContaining({
    id: todoStepId,
    status: 'in_progress'
  })
);
```

#### 期待される動作
ステップのステータスが更新されたときに`broadcastStepUpdate`が呼ばれることを期待

#### 実際の動作
`broadcastStepUpdate`が一度も呼ばれない（Number of calls: 0）

### 根本原因の分析

#### 1. RealtimeGatewayの実装確認
```typescript
// realtime.gateway.ts:219-227
public broadcastStepUpdate(caseId: number, stepId: number, data: any) {
  const roomId = `case-${caseId}`;
  this.server.to(roomId).emit('step-update', {
    caseId,
    stepId,
    data,
    timestamp: new Date().toISOString(),
  });
}
```
**メソッドは3つのパラメータを受け取る**: `caseId`, `stepId`, `data`

#### 2. テストのモック設定
```typescript
// kanban.controller.integration.spec.ts:43
jest.spyOn(realtimeGateway, 'broadcastStepUpdate').mockImplementation();
```
モック自体は正しく設定されている

#### 3. テストの期待値
```typescript
// テストは2つのパラメータで呼び出されることを期待
expect(realtimeGateway.broadcastStepUpdate).toHaveBeenCalledWith(
  testCaseId,  // 第1引数
  expect.objectContaining({  // 第2引数（オブジェクト）
    id: todoStepId,
    status: 'in_progress'
  })
);
```

#### 4. 実際の呼び出し方法（EventEmitterベース）
```typescript
// update-step-status.usecase.ts:53-59
this.eventEmitter.emit('step.status.updated', {
  caseId: step.getCaseId(),
  stepId: stepIdValue,
  oldStatus,
  newStatus: dto.status,
  updatedBy: dto.userId,
});
```

```typescript
// realtime.gateway.ts:263-277
@OnEvent('step.status.updated')
handleStepStatusUpdated(payload: {
  caseId: number;
  stepId: number;
  oldStatus: string;
  newStatus: string;
  updatedBy?: number;
}) {
  // 内部的にはemitを使用、broadcastStepUpdateは直接呼ばれない
  const roomId = `case-${payload.caseId}`;
  this.server.to(roomId).emit('step-status-updated', {
    ...payload,
    timestamp: new Date().toISOString(),
  });
}
```

### 問題の本質
**`broadcastStepUpdate`メソッドは直接呼ばれていない**。代わりに：
1. UseCaseが`EventEmitter`を使って`step.status.updated`イベントを発火
2. RealtimeGatewayが`@OnEvent`デコレータでイベントをリッスン
3. WebSocketで`step-status-updated`イベントを送信

テストは`broadcastStepUpdate`の直接呼び出しを期待しているが、実際のシステムはイベント駆動アーキテクチャを使用している。

---

## 問題2: テストデータ管理の問題

### 問題の詳細

#### 1. 外部キー制約違反
```typescript
// comment.controller.integration.spec.ts:248-257
const newStep = await prisma.stepInstance.create({
  data: {
    caseId: testCaseId,
    templateId: 1,  // ← ハードコードされたID
    name: 'TEST_STEP_NO_COMMENTS',
    dueDateUtc: new Date('2025-12-21'),
    status: 'todo',
    locked: false,
  }
});
```

**問題**: `templateId: 1`がハードコードされており、このIDのテンプレートが存在しない

#### 2. 初期データの想定違い
```typescript
// step.controller.integration.spec.ts:230
expect(initialStep?.assigneeId).toBeNull();
```

**問題**: テストデータ作成時にassigneeIdが設定されていないことを期待しているが、以前のテストの影響で値が残っている可能性

### テストデータ管理の問題点

#### 1. テスト間の独立性不足
- beforeAllで作成したデータを複数のテストで共有
- テストの実行順序によって結果が変わる可能性

#### 2. クリーンアップの不完全性
```typescript
// 現在のクリーンアップ順序
await prisma.stepInstance.deleteMany();
await prisma.case.deleteMany();
await prisma.stepTemplate.deleteMany();
await prisma.processTemplate.deleteMany();
```
順序は正しいが、WHERE条件が複雑でメンテナンスが困難

#### 3. ハードコードされた値
- templateId: 1
- userId: 1（TODO: Get from auth context）
- 日付の固定値

---

## 修正方針

### 問題1: WebSocket通知の修正案

#### 方法A: テストの期待値を修正（推奨）
```typescript
// テストでイベントエミッターの呼び出しを確認
const eventEmitter = app.get(EventEmitter2);
jest.spyOn(eventEmitter, 'emit');

// テスト後の検証
expect(eventEmitter.emit).toHaveBeenCalledWith(
  'step.status.updated',
  expect.objectContaining({
    caseId: testCaseId,
    stepId: todoStepId,
    newStatus: 'in_progress'
  })
);
```

#### 方法B: 直接broadcastStepUpdateを呼ぶように修正
UseCaseでRealtimeGatewayを注入して直接呼び出すが、アーキテクチャの一貫性が損なわれる

### 問題2: テストデータ管理の修正案

#### 1. 動的なテンプレートID取得
```typescript
// templateIdをハードコードせず、動的に取得
const templateWithSteps = await prisma.processTemplate.findFirst({
  where: { name: { startsWith: 'TEST_TEMPLATE_' } },
  include: { stepTemplates: true }
});

const newStep = await prisma.stepInstance.create({
  data: {
    caseId: testCaseId,
    templateId: templateWithSteps.stepTemplates[0].id,  // 動的に取得
    // ...
  }
});
```

#### 2. テストごとの独立したデータ作成
```typescript
describe('各テストスイート', () => {
  let localTestData: TestData;
  
  beforeEach(async () => {
    // 各テストごとに新しいデータを作成
    localTestData = await createTestData();
  });
  
  afterEach(async () => {
    // 各テスト後にクリーンアップ
    await cleanupTestData(localTestData);
  });
});
```

#### 3. テストデータファクトリーの導入
```typescript
// test/factories/test-data.factory.ts
export class TestDataFactory {
  static async createCase(options?: Partial<CaseData>) {
    const template = await this.createTemplate();
    return await prisma.case.create({
      data: {
        processId: template.id,
        title: options?.title || `TEST_CASE_${Date.now()}`,
        // ...
      }
    });
  }
  
  static async cleanup(prefix: string) {
    // プレフィックスベースの一括削除
  }
}
```

---

## 影響評価

### WebSocket通知の問題
- **影響範囲**: テストのみ（本番環境では正常動作）
- **重要度**: 中（テストの信頼性に影響）
- **修正工数**: 1-2時間

### テストデータ管理の問題
- **影響範囲**: 全統合テスト
- **重要度**: 中〜高（テストの再現性と保守性に影響）
- **修正工数**: 3-4時間（ファクトリー実装含む）

---

## 推奨アクションプラン

### Phase 1: 即座の修正（1時間）
1. **外部キー制約エラーの修正**
   - templateIdのハードコード削除
   - 動的なID取得に変更

2. **WebSocketテストの修正**
   - EventEmitterのモック追加
   - 期待値の変更

### Phase 2: 短期改善（2-3時間）
1. **テストデータファクトリーの作成**
   - 基本的なファクトリーメソッド実装
   - 既存テストへの段階的適用

2. **テスト独立性の改善**
   - beforeEach/afterEachへの移行
   - テスト間の依存関係除去

### Phase 3: 長期改善（1週間）
1. **テストインフラの整備**
   - Dockerベースのテスト環境
   - テストデータベースの自動リセット
   - 並列実行の最適化

2. **E2Eテストフレームワークの導入**
   - Playwrightなどの導入検討
   - WebSocket通信の実際のテスト

---

## リスクと対策

### リスク1: EventEmitterのモックによる副作用
- **リスク**: 他のイベントリスナーへの影響
- **対策**: 特定のイベントのみをスパイ

### リスク2: テストデータファクトリーの複雑化
- **リスク**: ファクトリー自体のバグ
- **対策**: シンプルな実装から始めて段階的に拡張

### リスク3: テスト実行時間の増加
- **リスク**: beforeEach化による実行時間増加
- **対策**: 必要最小限のデータ作成

---

## 結論

### WebSocket通知の問題
- アーキテクチャ（イベント駆動）とテストの期待値の不一致が原因
- システム自体は正常に動作している
- テストの修正で対応可能

### テストデータ管理の問題
- ハードコードと独立性不足が主な原因
- 段階的な改善で対応可能
- 長期的にはテストインフラの整備が必要

両問題とも**システムの動作には影響しない**が、テストの信頼性と保守性を向上させるために修正が推奨される。