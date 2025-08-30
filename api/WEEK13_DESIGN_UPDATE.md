# Week 13 設計書更新内容

## 更新日時
2025-08-29

## 更新理由
実装前の詳細レビューにより、既存コードとの整合性を高めるための調整が必要と判明

## 主要な更新内容

### 1. インポートパスの修正

#### 変更前
```typescript
import { SessionStatus } from '@domain/ai-agent/entities/interview-session.entity';
import { MessageRole } from '@domain/ai-agent/entities/conversation-message.entity';
```

#### 変更後
```typescript
// 正確なenumの配置場所からインポート
import { SessionStatus } from '@domain/ai-agent/enums/session-status.enum';
import { MessageRole } from '@domain/ai-agent/enums/message-role.enum';
```

**理由**: 実際のコードベースではenumは専用のenumディレクトリに配置されている

### 2. 共通ベースイベント型の追加

#### 新規追加
```typescript
// api/src/interfaces/events/base.event.ts
export interface BaseEvent {
  sessionId: string;
  timestamp: Date;
}

// 各イベントはBaseEventを拡張
export interface AISessionCreatedEvent extends BaseEvent {
  userId: number;
  context: any;
  // timestamp と sessionId は BaseEvent から継承
}
```

**理由**: コードの重複を削減し、一貫性を保つため

### 3. AINotificationとの関係性の明確化

#### 追記内容
```markdown
## 既存型との関係

### AINotification（既存）
- 用途: SocketGateway内部での汎用的な通知構造
- 保持: そのまま維持（破壊的変更を避ける）

### 新規イベント型定義
- 用途: クライアントとの契約、型安全性の向上
- 位置付け: AINotificationのdata部分の具体的な型定義

### マッピング戦略
```typescript
// 内部処理
const notification: AINotification = {
  type: 'message',
  sessionId: event.sessionId,
  data: event, // 型付けされたイベント
  timestamp: event.timestamp,
};
```
```

### 4. ファイル構成の最適化

#### 変更前
```
api/src/interfaces/events/
├── ai-session.events.ts
├── ai-message.events.ts
└── ai-template.events.ts
```

#### 変更後
```
api/src/interfaces/events/
├── base.event.ts          # 追加: 共通ベース型
├── ai-session.events.ts
├── ai-message.events.ts
├── ai-template.events.ts
└── index.ts               # 追加: バレルエクスポート
```

### 5. DTOの命名規則統一

#### 変更内容
- WebSocket DTOには`Ws`プレフィックスを付ける
- 例: `SessionStatusDto` → `WsSessionStatusDto`

**理由**: HTTP DTOとWebSocket DTOを明確に区別するため

### 6. イベント定数の管理

#### 追加
```typescript
// api/src/interfaces/events/event-names.ts
export const AI_EVENT_NAMES = {
  // Session events
  SESSION_CREATED: 'ai:session:created',
  SESSION_STATUS: 'ai:session:status',
  SESSION_ENDED: 'ai:session:ended',
  
  // Message events  
  MESSAGE_RECEIVED: 'ai:message:received',
  MESSAGE_TYPING: 'ai:message:typing',
  
  // Template events
  TEMPLATE_PROGRESS: 'ai:template:progress',
  TEMPLATE_COMPLETED: 'ai:template:completed',
} as const;

export type AIEventName = typeof AI_EVENT_NAMES[keyof typeof AI_EVENT_NAMES];
```

**理由**: イベント名の一元管理と型安全性の向上

## 実装への影響

### 影響範囲
- 新規ファイルの作成のみ
- 既存コードへの影響なし
- 追加実装の簡素化

### リスク評価
- リスクレベル: **低**
- 理由: 追加のみで既存機能への変更なし

## 承認事項

以下の更新内容で実装を進めてよいか：

1. ✅ インポートパスの修正
2. ✅ 共通ベースイベント型の追加
3. ✅ AINotificationとの共存戦略
4. ✅ ファイル構成の最適化
5. ✅ DTO命名規則の統一
6. ✅ イベント定数の一元管理

## 次のステップ

承認後、以下の順序で実装：

1. ディレクトリ構造の作成
2. base.event.tsの実装
3. event-names.tsの実装
4. 各イベント型定義の実装
5. WebSocket DTOの実装
6. index.tsでのバレルエクスポート