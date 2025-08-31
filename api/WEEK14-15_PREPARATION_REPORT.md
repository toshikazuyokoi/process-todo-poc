# Week 14-15 (Issue #38) 作業準備レポート

## 1. 作業概要

### Issue内容
- **タイトル**: [Week 14-15] コンポーネント実装
- **期間**: Week 14-15 (2週間)
- **工数**: 9日
- **担当**: Frontend Developer

### 主要タスク
1. **Task 4.1: AIチャットインターフェース（5日）**
2. **Task 4.2: テンプレートプレビュー・編集（4日）**

## 2. 実装スコープ分析

### 2.1 新規作成コンポーネント（11個）

#### チャット関連コンポーネント（6個）
```
web/app/ai-agent/components/
├── chat-interface.tsx          # メインチャットUI
├── message-list.tsx            # メッセージ履歴表示
├── message-input.tsx           # メッセージ入力フォーム
├── typing-indicator.tsx        # タイピング表示
├── suggestion-buttons.tsx      # 提案ボタン群
└── progress-indicator.tsx      # 進捗バー表示
```

#### テンプレート関連コンポーネント（5個）
```
web/app/ai-agent/components/
├── template-preview.tsx         # テンプレートプレビュー
├── template-editor.tsx          # テンプレート編集
├── step-recommendation-card.tsx # ステップ推奨カード
├── requirements-summary.tsx     # 要件サマリー表示
└── confidence-display.tsx       # 信頼度スコア表示
```

### 2.2 新規作成カスタムフック（4個）
```
web/app/ai-agent/hooks/
├── use-ai-chat.ts               # AIチャット管理
├── use-websocket.ts             # WebSocket接続管理
├── use-template-generation.ts   # テンプレート生成管理
└── use-session-management.ts    # セッション状態管理
```

## 3. 依存関係分析

### 3.1 既存システムとの統合ポイント

#### 既存WebSocketコンテキストの拡張が必要
- **現在**: `/web/app/contexts/websocket-context.tsx`
  - ケース管理用のWebSocket機能のみ実装済み
  - `joinCaseRoom`, `leaveCaseRoom`などケース特化機能

- **必要な拡張**:
  - AI Agent用の新しいnamespace対応
  - AI固有のイベントハンドリング追加
  - セッション管理機能の追加

#### 既存の型定義の拡張が必要
- **現在**: `/web/app/types/index.ts`
  - プロセステンプレート関連の型のみ定義

- **必要な追加**:
  - AI Agent関連の型定義
  - WebSocketイベントの型定義
  - メッセージやセッションの型定義

### 3.2 バックエンドAPIとの連携

#### 必要なAPI接続
```typescript
// Week 13で実装済みのWebSocketイベント
- 'ai:session:join'
- 'ai:session:leave'
- 'ai:message:send'
- 'ai:message:typing:indicator'
- 'ai:template:generate'
- 'ai:template:cancel'
- 'ai:template:approve'
```

#### 必要なDTOインポート
- バックエンドで定義済みのDTO型を参照する必要あり
- `/api/src/interfaces/dto/websocket/`から型定義をコピーまたは共有

## 4. 技術スタック確認

### 4.1 使用可能なライブラリ（package.json確認済み）
- ✅ **React 18.3.1**: コンポーネント実装
- ✅ **TypeScript 5.9.2**: 型安全性
- ✅ **Socket.io-client 4.8.1**: WebSocket通信
- ✅ **Zustand 5.0.7**: 状態管理
- ✅ **React Query 5.84.2**: APIデータ管理
- ✅ **React Hook Form 7.62.0**: フォーム管理
- ✅ **Tailwind CSS 3.4.17**: スタイリング
- ✅ **Lucide React 0.539.0**: アイコン
- ✅ **Date-fns 4.1.0**: 日付処理

### 4.2 追加が必要なライブラリ
- なし（既存のライブラリで実装可能）

## 5. 実装における注意事項

### 5.1 設計上の重要ポイント

1. **WebSocket接続の管理**
   - 既存のWebSocketContextを拡張するか、新規作成するか検討必要
   - AI Agent専用のnamespace `/ai-agent` への接続管理
   - 認証トークンの適切な管理

2. **状態管理の設計**
   - Zustandを使用したグローバル状態管理
   - セッション状態、メッセージ履歴、テンプレート生成状態の管理
   - React Queryとの適切な使い分け

3. **型定義の共有**
   - バックエンドのDTO型定義との整合性確保
   - 共通型定義ファイルの作成または型生成ツールの検討

4. **エラーハンドリング**
   - WebSocket接続エラーの適切な処理
   - ユーザーへのフィードバック表示
   - 再接続ロジックの実装

### 5.2 パフォーマンス目標達成のための考慮事項

- **コンポーネントレンダリング < 100ms**
  - React.memoの適切な使用
  - useMemoとuseCallbackの活用

- **メッセージ送信応答 < 200ms**
  - 楽観的更新の実装
  - ローディング状態の適切な表示

- **WebSocketイベント処理 < 50ms**
  - イベントハンドラーの最適化
  - 不要な再レンダリングの防止

- **メモリ使用量 < 50MB**
  - メッセージ履歴の適切な管理（仮想スクロール検討）
  - 不要なデータのクリーンアップ

## 6. 実装順序の推奨

### Day 1-2: 基盤構築
1. AI Agent用の型定義ファイル作成
2. WebSocket接続管理の基盤実装（use-websocket.ts）
3. セッション管理フック実装（use-session-management.ts）

### Day 3-4: チャットコンポーネント実装
1. chat-interface.tsx（メインコンテナ）
2. message-list.tsx（メッセージ表示）
3. message-input.tsx（入力フォーム）
4. typing-indicator.tsx（タイピング表示）

### Day 5-6: 進捗と提案機能
1. progress-indicator.tsx（進捗表示）
2. suggestion-buttons.tsx（提案ボタン）
3. use-ai-chat.ts（チャット管理フック）

### Day 7-8: テンプレート機能
1. template-preview.tsx（プレビュー）
2. step-recommendation-card.tsx（推奨カード）
3. requirements-summary.tsx（要件サマリー）
4. confidence-display.tsx（信頼度表示）

### Day 9: 統合とテスト
1. template-editor.tsx（編集機能）
2. use-template-generation.ts（生成管理フック）
3. 統合テストとデバッグ

## 7. リスクと対策

### リスク1: WebSocket接続の不安定性
- **対策**: 再接続ロジックの実装、オフライン時の適切な処理

### リスク2: 型定義の不整合
- **対策**: バックエンドとの密な連携、型定義の共有方法の確立

### リスク3: メモリリーク
- **対策**: useEffectのクリーンアップ適切な実装、WebSocketリスナーの適切な削除

### リスク4: パフォーマンス目標未達成
- **対策**: 早期のパフォーマンステスト、必要に応じた最適化

## 8. テスト計画

### ユニットテスト
- 各コンポーネントの単体テスト
- カスタムフックのテスト
- Jest + React Testing Libraryを使用

### インテグレーションテスト
- WebSocket通信のモックテスト
- コンポーネント間の連携テスト

### E2Eテスト（Week 16-17で実施予定）
- Playwrightを使用した実際の通信テスト
- ユーザーシナリオベースのテスト

## 9. 次のステップ

1. **設計レビュー**: このレポートの内容を確認し、実装方針を決定
2. **型定義の準備**: バックエンドのDTO型定義を参照し、フロントエンド用の型定義を作成
3. **ディレクトリ作成**: 必要なディレクトリ構造を作成
4. **実装開始**: Day 1の基盤構築から順次実装

## 10. 確認事項

### ユーザーへの確認が必要な項目

1. **WebSocketContext拡張 vs 新規作成**
   - 既存のWebSocketContextを拡張するか？
   - AI Agent専用の新しいコンテキストを作成するか？

2. **型定義の共有方法**
   - バックエンドのDTO型をコピーして使用するか？
   - 型生成ツール（OpenAPI Generator等）を導入するか？
   - 手動で型定義を管理するか？

3. **状態管理の方針**
   - Zustandですべての状態を管理するか？
   - React Queryとの使い分けの基準は？

4. **スタイリング方針**
   - Tailwind CSSのみで実装するか？
   - コンポーネントライブラリの追加は必要か？

5. **メッセージ履歴の管理**
   - 仮想スクロールを実装するか？
   - 最大保持メッセージ数の制限は？

---

**準備完了**: Week 14-15の実装に向けた詳細な分析と準備が完了しました。