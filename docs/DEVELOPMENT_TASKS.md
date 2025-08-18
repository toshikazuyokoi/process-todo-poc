# Phase 3.2 基本機能完成 - 開発タスク

## ブランチ情報
- ブランチ名: `feat/phase3.2-basic-features`
- 基準ブランチ: `main`
- Issue: #8

## 開発タスク一覧

### Week 1-2: 高優先度タスク

#### 1. スケジュール計算の修正
- [ ] DBマイグレーション: step_instances テーブルに start_date_utc カラム追加
- [ ] StepInstance エンティティに startDate プロパティ追加
- [ ] ReplanDomainService で開始日も計算するよう修正
- [ ] CreateCaseUseCase で開始日も保存
- [ ] GetGanttDataUseCase で開始日を使用
- [ ] 既存データのマイグレーション（開始日を逆算して設定）

#### 2. 担当者割当機能
- [ ] StepInstanceList に AssigneeSelector コンポーネント追加
- [ ] ユーザー一覧取得処理の実装
- [ ] 担当者変更時の楽観的更新
- [ ] WebSocket経由でのリアルタイム更新対応

### Week 3-4: 中優先度タスク

#### 3. コメント投稿機能
- [ ] AuthContext から現在のユーザーID取得
- [ ] エラーレスポンスの詳細表示
- [ ] コメント投稿後のWebSocket通知実装
- [ ] 楽観的更新の実装（即座に表示して、失敗時にロールバック）

#### 4. カンバン画面の実装
- [ ] CaseController の findAll で stepInstances を含めるよう修正
- [ ] または GET /api/kanban/board エンドポイント作成
- [ ] KanbanBoardComplete コンポーネントの動作確認と修正
- [ ] WebSocket統合でリアルタイム更新
- [ ] ドラッグ&ドロップ時の楽観的更新

### Week 5: 低優先度タスク

#### 5. カレンダー画面の実装
- [ ] caseDetailResponse.data.steps → stepInstances に修正
- [ ] 開始日フィールド実装後、start と end を適切に設定
- [ ] ダミーデータ表示を削除し、適切なエラーメッセージ表示
- [ ] GET /api/calendar エンドポイント作成（効率的なデータ取得）
- [ ] DraggableCalendar コンポーネントの動作確認

#### 6. テンプレート保存の修正
- [ ] Frontend の型定義を Backend DTO と一致させる
- [ ] バリデーションエラーの詳細表示（error.response?.data?.errors）
- [ ] requiredArtifacts の UI 実装（現在未実装）
- [ ] 保存前のペイロード確認（console.log）
- [ ] Backend のバリデーションエラーレスポンス改善

## テスト計画

### 単体テスト
- [ ] スケジュール計算ロジックのテスト
- [ ] 担当者割当の権限チェックテスト
- [ ] コメント投稿のバリデーションテスト

### 統合テスト
- [ ] 担当者割当フローのE2Eテスト
- [ ] コメント投稿フローのE2Eテスト
- [ ] カンバン操作フローのE2Eテスト

### 手動テスト
- [ ] ガントチャートの表示確認
- [ ] カレンダーのドラッグ&ドロップ動作確認
- [ ] カンバンのリアルタイム更新確認

## 開発環境セットアップ

```bash
# ブランチ切り替え
git checkout feat/phase3.2-basic-features

# 依存関係インストール
cd api && npm install
cd ../web && npm install

# データベース準備
cd api
npx prisma migrate dev

# 開発サーバー起動
# Terminal 1
cd api && npm run dev

# Terminal 2
cd web && npm run dev
```

## コミットメッセージ規約

- `feat:` 新機能追加
- `fix:` バグ修正
- `refactor:` リファクタリング
- `docs:` ドキュメント更新
- `test:` テスト追加・修正
- `style:` コードスタイルの変更
- `chore:` ビルドプロセスやツールの変更

例:
```
feat: 担当者割当機能の実装

- AssigneeSelector コンポーネント追加
- ユーザー一覧取得API統合
- リアルタイム更新対応

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 完了定義

各タスクは以下の条件を満たした時点で完了とする：

1. 機能が正常に動作する
2. エラーハンドリングが適切に実装されている
3. 必要なテストが作成されている
4. コードレビューで承認されている
5. ドキュメントが更新されている

## 参考資料

- [Phase 3.2 基本機能完成計画書](./phase3.2_basic_features_completion_plan.md)
- [GitHub Issue #8](https://github.com/toshikazuyokoi/process-todo-poc/issues/8)
- [プロジェクト仕様書](./process_todo_plan.md)