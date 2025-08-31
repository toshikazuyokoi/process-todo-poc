# AI Agent Integration Tests

## 概要
このディレクトリには、AI Agentコンポーネントの統合テストが含まれています。

## テストファイル構成

### 1. setup.ts
- テスト環境のセットアップ
- モックの設定（Socket.IO、API、Toast）
- ヘルパー関数の提供

### 2. chat-components.integration.test.tsx
- ChatInterfaceコンポーネントの統合テスト
- MessageList、MessageInputの動作確認
- チャットフロー全体のテスト

### 3. template-components.integration.test.tsx
- TemplatePreview、TemplateEditorの統合テスト
- StepRecommendationCard、RequirementsSummaryのテスト
- テンプレート変換ユーティリティのテスト

### 4. hooks.integration.test.tsx
- useAIWebSocket、useSessionManagementのテスト
- useAIChat、useTemplateGenerationのテスト
- フック間の連携テスト

### 5. performance.test.tsx
- レンダリングパフォーマンステスト
- WebSocketイベント処理のパフォーマンステスト
- メモリ使用量のテスト
- パフォーマンス目標の検証

## テストの実行

### 全テストの実行
```bash
cd /mnt/c/work/git2/process-todo/web
npm test app/ai-agent/__tests__
```

### 特定のテストファイルの実行
```bash
npm test app/ai-agent/__tests__/chat-components.integration.test.tsx
```

### カバレッジレポート付きで実行
```bash
npm test -- --coverage app/ai-agent/__tests__
```

### ウォッチモードで実行
```bash
npm test -- --watch app/ai-agent/__tests__
```

## パフォーマンス目標

設計書で定められた以下の目標を満たすことを確認：

- **コンポーネントレンダリング**: < 100ms ✅
- **メッセージ送信応答**: < 200ms ✅
- **WebSocketイベント処理**: < 50ms ✅
- **メモリ使用量**: < 50MB ✅

## モック戦略

### WebSocket
- Socket.IOクライアントを完全にモック
- MockSocketクラスでイベントエミッターを実装
- サーバーイベントのシミュレーション機能

### API
- api-clientを完全にモック
- 成功/失敗のレスポンスを制御可能
- React Queryとの統合を考慮

### Toast通知
- useToastフックをモック
- 通知の呼び出しを検証可能

## テストのベストプラクティス

1. **独立性**: 各テストは独立して実行可能
2. **クリーンアップ**: afterEachで必ずクリーンアップ
3. **非同期処理**: waitForを使用して適切に待機
4. **パフォーマンス**: performance.now()で正確な測定

## トラブルシューティング

### テストがタイムアウトする場合
- WebSocketモックの接続を確認
- waitForのタイムアウト値を調整

### メモリリークの警告が出る場合
- cleanupTestEnvironment()が呼ばれているか確認
- イベントリスナーの削除を確認

### パフォーマンステストが失敗する場合
- 他のプロセスがCPUを使用していないか確認
- テスト環境のスペックを確認

## 今後の改善点

1. E2Eテストの追加（Week 16-17で予定）
2. ビジュアルリグレッションテストの追加
3. アクセシビリティテストの追加
4. 国際化対応のテスト