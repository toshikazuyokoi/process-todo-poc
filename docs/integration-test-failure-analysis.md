# 統合テスト失敗の根本原因分析レポート

作成日: 2025-08-15
作成者: Claude Code
対象: Process Todo API 統合テスト

## エグゼクティブサマリー

統合テストが失敗する主要な原因は以下の3つです：

1. **StepControllerがClean Architectureに違反している** - UseCaseレイヤーを経由せず直接リポジトリを使用
2. **Step関連のUseCaseが完全に未実装** - `/application/usecases/step/`ディレクトリ自体が存在しない
3. **エラーハンドリングの不備** - 404を返すべき箇所で500エラーを返している

## 1. 調査方法

以下のファイルおよびディレクトリを詳細に調査しました：

- `/api/src/interfaces/controllers/step/step.controller.ts`
- `/api/src/interfaces/controllers/step/step.module.ts`
- `/api/src/application/usecases/` ディレクトリ構造
- `/api/src/infrastructure/infrastructure.module.ts`
- `/api/src/app.module.ts`
- 統合テストファイル群

## 2. 発見された問題

### 2.1 アーキテクチャ上の問題

#### 現在のStepControllerの実装パターン

```
Controller → Repository (直接アクセス)
```

#### 他のController（例：CaseController）の実装パターン

```
Controller → UseCase → Repository
```

**影響**: StepControllerだけが異なるパターンで実装されており、これが統合テストで期待される構造と不一致を起こしています。

### 2.2 存在しないUseCaseクラス

統合テストが期待しているが存在しないクラス：

| クラス名 | 用途 | ステータス |
|---------|------|-----------|
| `AssignStepToUserUseCase` | ステップへの担当者割当 | 未実装 |
| `UpdateStepStatusUseCase` | ステップステータス更新 | 未実装 |
| `LockStepUseCase` | ステップのロック | 未実装 |
| `UnlockStepUseCase` | ステップのアンロック | 未実装 |
| `GetStepByIdUseCase` | ステップ詳細取得 | 未実装 |
| `BulkUpdateStepsUseCase` | 一括更新 | 未実装 |

### 2.3 エラーレスポンスの問題

#### 現在のコード（step.controller.ts:58）

```typescript
if (!step) {
  throw new Error('Step not found');  // → 500 Internal Server Error
}
```

#### 期待される実装

```typescript
if (!step) {
  throw new NotFoundException('Step not found');  // → 404 Not Found
}
```

### 2.4 テストデータのクリーンアップ問題

外部キー制約により、削除順序が重要：

#### 誤った順序（現在）

```typescript
await prisma.processTemplate.deleteMany(...)  // 親テーブルを先に削除しようとする
await prisma.stepTemplate.deleteMany(...)     // 子テーブル
```

#### 正しい順序

```typescript
// 1. 子テーブルから削除
await prisma.stepInstance.deleteMany(...)
await prisma.stepTemplate.deleteMany(...)  
await prisma.case.deleteMany(...)
// 2. 親テーブルを削除
await prisma.processTemplate.deleteMany(...)
await prisma.user.deleteMany(...)
```

## 3. 影響範囲分析

| 影響領域 | 影響度 | 詳細 |
|---------|--------|------|
| 統合テスト | 高 | 完全に実行不可能 |
| 単体テスト | 中 | StepController関連のテストが作成困難 |
| 保守性 | 高 | ビジネスロジックがControllerに混在 |
| 拡張性 | 中 | 新機能追加時の影響範囲が大きい |
| コードの一貫性 | 高 | 他のControllerと異なる実装パターン |

## 4. 根本原因

### 4.1 設計の不整合

- StepControllerが最初に実装された際、Clean Architectureの原則が適用されなかった
- 他のControllerは後から正しいパターンで実装されたが、StepControllerは修正されなかった

### 4.2 テスト戦略の不備

- 統合テストが実装される前にアーキテクチャが変更された
- テストファーストアプローチが採用されていなかった

## 5. 推奨される修正アプローチ

### Phase 1: UseCaseレイヤーの実装（優先度：高）

1. `/application/usecases/step/`ディレクトリ作成
2. 各UseCaseクラスの実装
   - ビジネスロジックの抽出
   - 依存性注入の設定
   - エラーハンドリングの実装
3. 既存のControllerロジックをUseCaseに移動

### Phase 2: Controllerのリファクタリング（優先度：高）

1. 直接的なリポジトリアクセスを削除
2. UseCaseを通じた処理に変更
3. 適切なHTTP例外の使用
   - `NotFoundException`
   - `BadRequestException`
   - `ConflictException`

### Phase 3: テストの修正（優先度：中）

1. データクリーンアップ順序の修正
2. モックの調整
3. アサーションの更新
4. テストカバレッジの向上

### Phase 4: ドキュメント化（優先度：低）

1. アーキテクチャガイドラインの作成
2. コーディング規約の明文化
3. テスト戦略の文書化

## 6. 実装タイムライン

| フェーズ | 推定工数 | 依存関係 |
|---------|---------|---------|
| Phase 1 | 4-6時間 | なし |
| Phase 2 | 2-3時間 | Phase 1 |
| Phase 3 | 2-3時間 | Phase 2 |
| Phase 4 | 1-2時間 | Phase 3 |

## 7. リスクと対策

| リスク | 可能性 | 影響度 | 対策 |
|--------|--------|--------|------|
| 既存機能への影響 | 中 | 高 | 段階的なリファクタリング、充実したテスト |
| パフォーマンス劣化 | 低 | 中 | パフォーマンステストの実施 |
| 新たなバグの混入 | 中 | 中 | コードレビュー、テスト駆動開発 |

## 8. 成功基準

- [ ] すべての統合テストがパスする
- [ ] コードカバレッジが70%以上
- [ ] Clean Architectureの原則に準拠
- [ ] 一貫したエラーハンドリング
- [ ] ドキュメントの完備

## 9. 結論

統合テストの失敗は、StepControllerの設計がClean Architectureの原則から逸脱していることが主な原因です。この問題を解決するには、UseCaseレイヤーの実装とControllerのリファクタリングが必要不可欠です。

推奨されるアプローチに従って修正を行うことで、以下のメリットが得られます：

1. **テスタビリティの向上** - 単体テストと統合テストの両方が容易に
2. **保守性の向上** - ビジネスロジックの集約
3. **拡張性の向上** - 新機能追加時の影響範囲の最小化
4. **コードの一貫性** - 全Controllerで統一されたパターン

## 付録A: ファイル構造の比較

### 現在のStep関連ファイル構造
```
src/
├── interfaces/controllers/step/
│   ├── step.controller.ts
│   └── step.module.ts
└── application/usecases/
    └── (stepディレクトリなし)
```

### 期待される構造
```
src/
├── interfaces/controllers/step/
│   ├── step.controller.ts
│   └── step.module.ts
└── application/usecases/step/
    ├── assign-step-to-user.usecase.ts
    ├── update-step-status.usecase.ts
    ├── lock-step.usecase.ts
    ├── unlock-step.usecase.ts
    ├── get-step-by-id.usecase.ts
    └── bulk-update-steps.usecase.ts
```

## 付録B: 関連ファイルリスト

- `/api/src/interfaces/controllers/step/step.controller.ts`
- `/api/src/interfaces/controllers/step/step.module.ts`
- `/api/src/interfaces/controllers/step/step.controller.integration.spec.ts`
- `/api/src/infrastructure/repositories/step-instance.repository.ts`
- `/api/src/domain/entities/step-instance.ts`
- `/api/src/app.module.ts`

---

*このレポートは、Process Todo APIの統合テスト失敗に関する詳細な分析結果です。質問や追加の調査が必要な場合は、開発チームまでお問い合わせください。*