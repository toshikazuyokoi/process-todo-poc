# Week 13 詳細実装設計レポート

## 重要な発見事項

### 1. SocketGatewayの現状分析
**すでに高度に実装されている！**

#### 実装済み機能
```typescript
// 基本機能
- WebSocketGateway設定済み（namespace: '/ai-agent'）
- 認証機能実装済み（SocketAuthGuard）
- ルーム管理実装済み（sessionRooms Map）
- ユーザー追跡実装済み（userSockets Map）

// AI関連メソッド（すでに存在！）
- broadcastConversationUpdate()
- broadcastStatusChange()
- broadcastProgress()
- broadcastTemplateGenerated()
- broadcastError()
- notifyResearchComplete()
- notifyTemplateGenerated()
- notifyRequirementsExtracted()
- notifySessionStatusChanged()
- notifyError()
```

### 2. UseCase層との統合状況
**すでに直接呼び出しで統合されている！**

```typescript
// ProcessUserMessageUseCaseの例
this.socketGateway.broadcastConversationUpdate(input.sessionId, {
  message: ConversationMessageMapper.toDto(userMessageEntity),
  response: ConversationMessageMapper.toDto(assistantMessageEntity),
  timestamp: new Date(),
});
```

### 3. EventEmitterパターンの現状
**RealtimeGatewayでのみ使用されている**

```typescript
// RealtimeGateway
@OnEvent('step.status.updated')
handleStepStatusUpdated(payload: {...})

// UpdateStepStatusUseCase
this.eventEmitter.emit('step.status.updated', {...});
```

## 実装方針の再検討

### 現実的な実装スコープ

#### Option A: 最小限の拡張（推奨）✅
**理由**: SocketGatewayはすでに機能的に完成している

**実装内容**:
1. イベント定義ファイルの作成（型安全性向上）
2. DTOファイルの作成（データ構造の明確化）
3. 不足しているイベントハンドラーの追加（もしあれば）
4. EventEmitterとの統合オプション提供

#### Option B: EventEmitter統合
**非推奨理由**: 
- 既存の直接呼び出しパターンが機能している
- 複雑性が増すだけで利点が少ない
- 破壊的変更になる可能性

## 詳細実装設計

### 1. 新規作成ファイル

#### api/src/interfaces/events/ai-session.events.ts
```typescript
import { SessionStatus } from '@domain/ai-agent/entities/interview-session.entity';

export enum AISessionEventType {
  // サーバー → クライアント
  SESSION_CREATED = 'ai:session:created',
  SESSION_STATUS_CHANGED = 'ai:session:status',
  SESSION_ENDED = 'ai:session:ended',
  SESSION_EXPIRED = 'ai:session:expired',
  
  // クライアント → サーバー
  JOIN_SESSION = 'ai:session:join',
  LEAVE_SESSION = 'ai:session:leave',
  REQUEST_STATUS = 'ai:session:status:request',
}

export interface AISessionCreatedEvent {
  sessionId: string;
  userId: number;
  context: any;
  timestamp: Date;
}

export interface AISessionStatusChangedEvent {
  sessionId: string;
  oldStatus: SessionStatus;
  newStatus: SessionStatus;
  reason?: string;
  timestamp: Date;
}

export interface AISessionEndedEvent {
  sessionId: string;
  reason: 'completed' | 'cancelled' | 'error';
  summary?: any;
  timestamp: Date;
}
```

#### api/src/interfaces/events/ai-message.events.ts
```typescript
import { MessageRole } from '@domain/ai-agent/entities/conversation-message.entity';

export enum AIMessageEventType {
  // サーバー → クライアント
  MESSAGE_RECEIVED = 'ai:message:received',
  MESSAGE_TYPING = 'ai:message:typing',
  MESSAGE_ERROR = 'ai:message:error',
  REQUIREMENTS_EXTRACTED = 'ai:requirements:extracted',
  
  // クライアント → サーバー
  SEND_MESSAGE = 'ai:message:send',
  TYPING_INDICATOR = 'ai:message:typing:indicator',
}

export interface AIMessageReceivedEvent {
  sessionId: string;
  messageId: string;
  content: string;
  role: MessageRole;
  suggestedQuestions?: string[];
  confidence?: number;
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
  };
  timestamp: Date;
}

export interface AIMessageTypingEvent {
  sessionId: string;
  isTyping: boolean;
  estimatedTime?: number; // seconds
  timestamp: Date;
}

export interface AIRequirementsExtractedEvent {
  sessionId: string;
  requirements: Array<{
    category: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
  }>;
  totalCount: number;
  timestamp: Date;
}
```

#### api/src/interfaces/events/ai-template.events.ts
```typescript
export enum AITemplateEventType {
  // サーバー → クライアント
  GENERATION_STARTED = 'ai:template:started',
  GENERATION_PROGRESS = 'ai:template:progress',
  GENERATION_PREVIEW = 'ai:template:preview',
  GENERATION_COMPLETED = 'ai:template:completed',
  GENERATION_FAILED = 'ai:template:failed',
  RESEARCH_COMPLETE = 'ai:template:research:complete',
  
  // クライアント → サーバー
  REQUEST_GENERATION = 'ai:template:generate',
  CANCEL_GENERATION = 'ai:template:cancel',
  APPROVE_TEMPLATE = 'ai:template:approve',
}

export interface AITemplateProgressEvent {
  sessionId: string;
  stage: 'initializing' | 'researching' | 'analyzing' | 'generating' | 'validating' | 'finalizing';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
  timestamp: Date;
}

export interface AITemplatePreviewEvent {
  sessionId: string;
  templateId: string;
  preview: {
    title: string;
    description: string;
    stepCount: number;
    estimatedDuration: number;
    confidence: number;
  };
  timestamp: Date;
}

export interface AITemplateCompletedEvent {
  sessionId: string;
  templateId: string;
  template: any; // ProcessTemplate
  metadata: {
    generationTime: number;
    stepsGenerated: number;
    researchSources: number;
    confidence: number;
  };
  timestamp: Date;
}
```

#### api/src/interfaces/dto/websocket/session-status.dto.ts
```typescript
import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { SessionStatus } from '@domain/ai-agent/entities/interview-session.entity';

export class SessionStatusDto {
  @IsString()
  sessionId: string;

  @IsEnum(SessionStatus)
  status: SessionStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsDateString()
  timestamp: string;
}

export class JoinSessionDto {
  @IsString()
  sessionId: string;
}

export class LeaveSessionDto {
  @IsString()
  sessionId: string;
}

export class RequestSessionStatusDto {
  @IsString()
  sessionId: string;
}
```

#### api/src/interfaces/dto/websocket/message-notification.dto.ts
```typescript
import { IsString, IsBoolean, IsNumber, IsOptional, IsArray, IsEnum } from 'class-validator';
import { MessageRole } from '@domain/ai-agent/entities/conversation-message.entity';

export class MessageNotificationDto {
  @IsString()
  sessionId: string;

  @IsString()
  messageId: string;

  @IsString()
  content: string;

  @IsEnum(MessageRole)
  role: MessageRole;

  @IsOptional()
  @IsArray()
  suggestedQuestions?: string[];

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsString()
  timestamp: string;
}

export class TypingIndicatorDto {
  @IsString()
  sessionId: string;

  @IsBoolean()
  isTyping: boolean;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;
}
```

#### api/src/interfaces/dto/websocket/template-progress.dto.ts
```typescript
import { IsString, IsNumber, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateGenerationStage {
  INITIALIZING = 'initializing',
  RESEARCHING = 'researching',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  VALIDATING = 'validating',
  FINALIZING = 'finalizing',
}

export class TemplateProgressDto {
  @IsString()
  sessionId: string;

  @IsEnum(TemplateGenerationStage)
  stage: TemplateGenerationStage;

  @IsNumber()
  progress: number; // 0-100

  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  estimatedTimeRemaining?: number;

  @IsString()
  timestamp: string;
}

export class TemplatePreviewDto {
  @IsString()
  sessionId: string;

  @IsString()
  templateId: string;

  @ValidateNested()
  @Type(() => TemplatePreviewData)
  preview: TemplatePreviewData;

  @IsString()
  timestamp: string;
}

class TemplatePreviewData {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  stepCount: number;

  @IsNumber()
  estimatedDuration: number;

  @IsNumber()
  confidence: number;
}
```

### 2. SocketGateway拡張

#### 追加するイベントハンドラー

```typescript
// api/src/infrastructure/websocket/socket.gateway.ts への追加

import { 
  AISessionEventType,
  AIMessageEventType,
  AITemplateEventType,
} from '@interfaces/events';
import {
  SessionStatusDto,
  JoinSessionDto,
  RequestSessionStatusDto,
  TypingIndicatorDto,
} from '@interfaces/dto/websocket';

// 新規メソッド追加

/**
 * Handle typing indicator from client
 */
@SubscribeMessage('ai:message:typing:indicator')
async handleTypingIndicator(
  @MessageBody() data: TypingIndicatorDto,
  @ConnectedSocket() client: Socket,
) {
  try {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    const room = this.sessionRooms.get(data.sessionId);
    if (!room || room.userId !== userId) {
      throw new WsException('Unauthorized session access');
    }

    // Broadcast to other clients in the session
    client.to(`session:${data.sessionId}`).emit(AIMessageEventType.MESSAGE_TYPING, {
      sessionId: data.sessionId,
      isTyping: data.isTyping,
      estimatedTime: data.estimatedTime,
      timestamp: new Date(),
    });

    this.logger.debug(`Typing indicator for session ${data.sessionId}: ${data.isTyping}`);
  } catch (error) {
    this.logger.error('Typing indicator error', error);
    client.emit('error', {
      message: error.message || 'Failed to send typing indicator',
    });
  }
}

/**
 * Request session status
 */
@SubscribeMessage('ai:session:status:request')
async handleStatusRequest(
  @MessageBody() data: RequestSessionStatusDto,
  @ConnectedSocket() client: Socket,
) {
  try {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    // This would call a use case to get actual status
    // For now, return from room data
    const room = this.sessionRooms.get(data.sessionId);
    if (!room || room.userId !== userId) {
      throw new WsException('Session not found or unauthorized');
    }

    client.emit(AISessionEventType.SESSION_STATUS_CHANGED, {
      sessionId: data.sessionId,
      status: 'active', // Would get from UseCase
      timestamp: new Date(),
    });
  } catch (error) {
    this.logger.error('Status request error', error);
    client.emit('error', {
      message: error.message || 'Failed to get session status',
    });
  }
}

/**
 * Send template generation progress
 */
sendTemplateProgress(
  sessionId: string,
  stage: string,
  progress: number,
  message: string,
  estimatedTime?: number,
) {
  this.sendToSession(sessionId, {
    type: 'progress',
    sessionId,
    data: {
      stage,
      progress,
      message,
      estimatedTimeRemaining: estimatedTime,
    },
    timestamp: new Date(),
  });

  this.logger.debug(`Template progress for session ${sessionId}: ${stage} ${progress}%`);
}

/**
 * Send requirements extracted notification
 */
sendRequirementsExtracted(sessionId: string, requirements: any[]) {
  this.sendToSession(sessionId, {
    type: 'message',
    sessionId,
    data: {
      event: AIMessageEventType.REQUIREMENTS_EXTRACTED,
      requirements,
      totalCount: requirements.length,
    },
    timestamp: new Date(),
  });

  this.logger.log(`Requirements extracted for session ${sessionId}: ${requirements.length} items`);
}
```

### 3. UseCase層との統合強化

#### EventEmitterオプション（追加実装）

```typescript
// api/src/infrastructure/websocket/socket.gateway.ts

import { OnEvent } from '@nestjs/event-emitter';

// EventEmitter経由の通知受信（オプション）
@OnEvent('ai.session.created')
handleAISessionCreated(payload: any) {
  this.logger.log(`AI session created: ${payload.sessionId}`);
  
  // Send to user
  this.sendToUser(payload.userId, AISessionEventType.SESSION_CREATED, {
    sessionId: payload.sessionId,
    context: payload.context,
    timestamp: new Date(),
  });
}

@OnEvent('ai.message.processed')
handleAIMessageProcessed(payload: any) {
  this.broadcastConversationUpdate(
    payload.sessionId,
    payload.message,
  );
}

@OnEvent('ai.template.progress')
handleTemplateProgress(payload: any) {
  this.sendTemplateProgress(
    payload.sessionId,
    payload.stage,
    payload.progress,
    payload.message,
    payload.estimatedTime,
  );
}

@OnEvent('ai.requirements.extracted')
handleRequirementsExtracted(payload: any) {
  this.sendRequirementsExtracted(
    payload.sessionId,
    payload.requirements,
  );
}
```

### 4. 実装における注意点

#### 1. 既存機能との互換性維持
- 既存の直接呼び出しパターンを維持
- EventEmitterは追加オプションとして実装
- 破壊的変更を避ける

#### 2. 型安全性の向上
- イベント定義の型付け
- DTOによるバリデーション
- TypeScript enumの活用

#### 3. エラーハンドリング
- WsExceptionの適切な使用
- クライアントへのエラー通知
- ログ記録の充実

#### 4. パフォーマンス
- ルーム管理の効率化
- 不要なブロードキャストの削減
- メモリリークの防止

### 5. テスト戦略

#### ユニットテスト
```typescript
// socket.gateway.spec.ts
describe('SocketGateway - AI Events', () => {
  it('should handle typing indicator', async () => {
    // Test typing indicator broadcast
  });

  it('should handle status request', async () => {
    // Test status request handling
  });

  it('should send template progress', () => {
    // Test progress notification
  });
});
```

#### 統合テスト
```typescript
// ai-websocket.e2e-spec.ts
describe('AI WebSocket Integration', () => {
  it('should handle full session lifecycle', async () => {
    // Connect → Join → Messages → Template → Disconnect
  });
});
```

## 実装手順（改訂版）

### Day 1: 型定義とDTO
1. イベント定義ファイル作成（3ファイル）
2. DTO定義ファイル作成（3ファイル）
3. 既存コードとの整合性確認

### Day 2: SocketGateway拡張
1. 新規イベントハンドラー追加
2. 型定義の適用
3. エラーハンドリング強化

### Day 3: EventEmitter統合（オプション）
1. OnEventハンドラー追加
2. UseCase層への影響調査
3. 段階的移行計画作成

### Day 4: テストと文書化
1. ユニットテスト作成
2. 統合テスト実装
3. API仕様書更新

## リスク評価（改訂版）

### Low Risk ✅
- イベント/DTO定義の追加
- 新規イベントハンドラーの追加
- 型安全性の向上

### Medium Risk ⚠️
- EventEmitter統合（既存パターンとの共存）
- パフォーマンスへの影響

### High Risk ❌
- 既存の直接呼び出しパターンの変更
- 破壊的な変更

## 結論

### 実装方針
1. **最小限の拡張**を基本方針とする
2. **型安全性の向上**に重点を置く
3. **既存機能との互換性**を最優先
4. **EventEmitter統合はオプション**として段階的に実装

### 期待される成果
- ✅ 型定義による開発効率向上
- ✅ DTOによるデータ検証強化
- ✅ 将来的な拡張性の確保
- ✅ 既存機能への影響なし

### 実装優先順位
1. **必須**: イベント/DTO定義ファイル作成
2. **推奨**: 不足イベントハンドラーの追加
3. **オプション**: EventEmitter統合
4. **将来**: クライアントSDKの型定義生成