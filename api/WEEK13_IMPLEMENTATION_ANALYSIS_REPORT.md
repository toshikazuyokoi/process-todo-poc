# Week 13 (Issue #37) 実装分析レポート

## 概要
Week 13では「フロントエンド実装開始」として、AIエージェント機能のWebSocket通信基盤を実装します。  
**重要**: タスク名は「フロントエンド実装開始」ですが、実際の作業内容は**バックエンドのWebSocket拡張**です。

## Issue #37 の要件

### 主要タスク
- **Task 3.3: AI Chat Interface基盤**（4日）
  - AI関連WebSocketイベント追加
  - リアルタイム通知実装
  - セッション状態同期実装

### 成果物
```
api/src/interfaces/gateways/
└── socket.gateway.ts (拡張)

api/src/interfaces/events/
├── ai-session.events.ts
├── ai-message.events.ts
└── ai-template.events.ts

api/src/interfaces/dto/websocket/
├── session-status.dto.ts
├── message-notification.dto.ts
└── template-progress.dto.ts
```

## 現状分析

### 既存のWebSocket実装

#### 1. RealtimeGateway (`api/src/infrastructure/gateways/realtime.gateway.ts`)
- **名前空間**: `/realtime`
- **用途**: ケース・ステップのリアルタイム更新
- **機能**:
  - ルーム管理（case-{id}形式）
  - ケース更新通知
  - ステップ更新通知
  - コメント通知

#### 2. SocketGateway (`api/src/infrastructure/websocket/socket.gateway.ts`)
- **名前空間**: `/ai-agent`
- **用途**: AIエージェント専用（すでに存在！）
- **機能**:
  - AIセッションルーム管理
  - AINotificationインターフェース定義済み
  - ユーザー認証・ソケット管理

### 重要な発見
**SocketGatewayはすでにAIエージェント用に準備されている！**
- 名前空間が`/ai-agent`
- AISessionRoom、AINotificationの型定義済み
- 基本的なルーム管理機能実装済み

## 実装方針

### アプローチの選択

#### オプションA: SocketGatewayを拡張（推奨）✅
**理由**:
1. すでにAIエージェント専用の名前空間で設定済み
2. 基本的な型定義とルーム管理が実装済み
3. 既存コードとの一貫性が高い

**実装内容**:
- SocketGatewayにAI関連イベントハンドラーを追加
- 既存の型定義を活用・拡張
- UseCase層との連携を実装

#### オプションB: 新規Gatewayを作成
**非推奨理由**:
- SocketGatewayと重複する
- 名前空間の競合リスク
- 不要な複雑性増加

## 詳細実装計画

### 1. WebSocketイベント設計

#### 送信イベント（Server → Client）
```typescript
// セッション関連
'ai:session:created'      // セッション作成通知
'ai:session:status'        // ステータス変更通知
'ai:session:ended'         // セッション終了通知
'ai:session:expired'       // セッション期限切れ通知

// メッセージ関連
'ai:message:received'      // AI応答受信
'ai:message:typing'        // AI入力中状態
'ai:message:error'         // メッセージエラー

// テンプレート生成関連
'ai:template:progress'     // 生成進捗（0-100%）
'ai:template:preview'      // プレビュー準備完了
'ai:template:completed'    // 生成完了
'ai:template:failed'       // 生成失敗

// 要件抽出関連
'ai:requirements:extracted' // 要件抽出完了
'ai:requirements:updated'   // 要件更新
```

#### 受信イベント（Client → Server）
```typescript
'ai:session:join'          // セッションルーム参加
'ai:session:leave'         // セッションルーム退出
'ai:message:send'          // メッセージ送信（バックアップ用）
'ai:template:request'      // テンプレート生成リクエスト
'ai:status:request'        // ステータス確認要求
```

### 2. DTOとイベント定義

#### ai-session.events.ts
```typescript
export enum AISessionEventType {
  CREATED = 'ai:session:created',
  STATUS_CHANGED = 'ai:session:status',
  ENDED = 'ai:session:ended',
  EXPIRED = 'ai:session:expired',
}

export interface AISessionEvent {
  sessionId: string;
  userId: number;
  status: SessionStatus;
  metadata?: any;
  timestamp: Date;
}
```

#### ai-message.events.ts
```typescript
export enum AIMessageEventType {
  RECEIVED = 'ai:message:received',
  TYPING = 'ai:message:typing',
  ERROR = 'ai:message:error',
}

export interface AIMessageEvent {
  sessionId: string;
  messageId?: string;
  content?: string;
  role: MessageRole;
  metadata?: {
    tokens?: number;
    processingTime?: number;
  };
  error?: string;
  timestamp: Date;
}
```

#### ai-template.events.ts
```typescript
export enum AITemplateEventType {
  PROGRESS = 'ai:template:progress',
  PREVIEW = 'ai:template:preview',
  COMPLETED = 'ai:template:completed',
  FAILED = 'ai:template:failed',
}

export interface AITemplateEvent {
  sessionId: string;
  templateId?: string;
  progress?: number; // 0-100
  status: 'processing' | 'preview' | 'completed' | 'failed';
  data?: any;
  error?: string;
  timestamp: Date;
}
```

### 3. SocketGateway拡張内容

#### 追加するメソッド
```typescript
// セッション管理
@SubscribeMessage('ai:session:join')
async handleJoinSession(client: Socket, payload: JoinSessionDto)

@SubscribeMessage('ai:session:leave')
async handleLeaveSession(client: Socket, payload: LeaveSessionDto)

// ステータス確認
@SubscribeMessage('ai:status:request')
async handleStatusRequest(client: Socket, payload: StatusRequestDto)

// UseCase層からの通知用メソッド（内部API）
broadcastSessionEvent(sessionId: string, event: AISessionEvent)
broadcastMessageEvent(sessionId: string, event: AIMessageEvent)
broadcastTemplateEvent(sessionId: string, event: AITemplateEvent)
sendTypingIndicator(sessionId: string, isTyping: boolean)
```

### 4. UseCase層との統合

#### EventEmitterを使用した非同期通知
```typescript
// UseCase内でイベント発行
this.eventEmitter.emit('ai.message.processed', {
  sessionId,
  messageId,
  response,
});

// SocketGatewayでイベント受信
@OnEvent('ai.message.processed')
handleMessageProcessed(payload: MessageProcessedEvent) {
  this.broadcastMessageEvent(payload.sessionId, {
    type: AIMessageEventType.RECEIVED,
    ...payload,
  });
}
```

### 5. 実装上の注意点

#### 既存コードとの整合性
1. **名前空間の分離**: `/realtime`（既存）と`/ai-agent`（AI用）を明確に分離
2. **認証の統一**: SocketAuthGuardを活用
3. **エラーハンドリング**: WsExceptionを適切に使用

#### パフォーマンス考慮
1. **ルーム管理**: セッションごとにルームを作成
2. **メモリ管理**: 不要なルーム・接続の適切なクリーンアップ
3. **ブロードキャスト最適化**: 必要なクライアントのみに送信

#### セキュリティ
1. **認証必須**: 全イベントでユーザー認証確認
2. **権限チェック**: セッションの所有者確認
3. **レート制限**: WebSocketレベルでの制限実装

## リスクと対策

### リスク1: 既存SocketGatewayとの競合
- **対策**: 慎重な拡張と十分なテスト

### リスク2: UseCase層との結合度
- **対策**: EventEmitterによる疎結合化

### リスク3: クライアント側の実装遅延
- **対策**: モッククライアントでのテスト準備

## 実装手順

### Phase 1: 基盤準備（Day 1）
1. イベント定義ファイル作成
2. DTO定義ファイル作成
3. SocketGateway基本拡張

### Phase 2: イベントハンドラー実装（Day 2）
1. セッション管理イベント実装
2. メッセージ関連イベント実装
3. テンプレート関連イベント実装

### Phase 3: UseCase統合（Day 3）
1. EventEmitter設定
2. 各UseCaseからのイベント発行実装
3. SocketGatewayでのイベント受信実装

### Phase 4: テスト・検証（Day 4）
1. ユニットテスト作成
2. 統合テスト実装
3. WebSocketクライアントでの動作確認

## 結論

Week 13の実装は、**既存のSocketGatewayを拡張**することで効率的に実現可能です。
すでにAIエージェント用の基盤が準備されているため、イベントハンドラーの追加とUseCase層との統合に注力できます。

### 成功指標
- ✅ 全AIイベントのリアルタイム通知が動作
- ✅ セッション状態の同期が正確
- ✅ エラー処理が適切に実装
- ✅ 既存機能への影響なし

### 次のステップ
1. このレポートのレビューと承認
2. 実装開始（SocketGateway拡張）
3. Phase 1から順次実装