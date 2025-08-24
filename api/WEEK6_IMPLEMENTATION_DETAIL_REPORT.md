# Week 6 実装詳細レポート

## 概要
Week 6では、AIエージェント機能のコアユースケース実装を行います。具体的には、インタビューセッション管理機能とメッセージ処理機能の基盤部分を実装します。

## 実装対象範囲

### Task 2.1: インタビューセッション管理（4日）

#### 1. 実装ファイル

##### A. Use Cases (4ファイル)
```
api/src/application/usecases/ai-agent/
├── start-interview-session.usecase.ts
├── get-interview-session.usecase.ts  
├── end-interview-session.usecase.ts
└── cleanup-expired-sessions.usecase.ts
```

##### B. DTOs (3ファイル)
```
api/src/application/dto/ai-agent/
├── start-session.dto.ts
├── session-response.dto.ts
└── session-context.dto.ts
```

##### C. Controller (1ファイル)
```
api/src/interfaces/controllers/
└── ai-agent.controller.ts (部分実装)
```

#### 2. 実装エンドポイント
- `POST /api/ai-agent/sessions` - セッション開始
- `GET /api/ai-agent/sessions/{sessionId}` - セッション取得
- `DELETE /api/ai-agent/sessions/{sessionId}` - セッション終了

### Task 2.2: 対話処理ユースケース（Week 6では2ファイルのみ）

#### 1. 実装ファイル

##### A. Use Cases (2ファイル - Week 6実装分)
```
api/src/application/usecases/ai-agent/
├── process-user-message.usecase.ts
└── get-conversation-history.usecase.ts
```

##### B. DTOs (3ファイル)
```
api/src/application/dto/ai-agent/
├── send-message.dto.ts
├── message-response.dto.ts
└── requirement-extraction.dto.ts
```

#### 2. 実装エンドポイント
- `POST /api/ai-agent/sessions/{sessionId}/messages` - メッセージ送信
- `GET /api/ai-agent/sessions/{sessionId}/messages` - 会話履歴取得

## 詳細実装内容

### 1. StartInterviewSessionUseCase

#### 実装メソッド（設計書より）
```typescript
class StartInterviewSessionUseCase {
  // 依存性注入
  - sessionRepository: InterviewSessionRepository     // Week 1で実装済み
  - conversationService: AIConversationService        // Week 2で実装済み
  - configService: AIConfigService                    // Week 3で実装済み
  - rateLimitService: AIRateLimitService             // Week 3で実装済み
  
  // メインメソッド
  + execute(input: StartSessionInput): Promise<StartSessionOutput>
  
  // プライベートメソッド
  - validateInput(input: StartSessionInput): void
  - checkRateLimit(userId: number): Promise<void>
  - createSession(input: StartSessionInput): Promise<InterviewSession>
  - generateWelcomeMessage(context: SessionContext): Promise<string>
}
```

#### 処理フロー（シーケンス図より）
1. 入力データ検証（industry, processType, goalの必須チェック）
2. レート制限チェック（1ユーザー5セッション/日まで）
3. AIConversationServiceでセッション初期化
4. ウェルカムメッセージ生成（OpenAI API使用）
5. InterviewSessionエンティティ作成・保存
6. 会話履歴をRedisキャッシュに保存
7. WebSocketで接続クライアントに通知

### 2. ProcessUserMessageUseCase

#### 実装メソッド（設計書より）
```typescript
class ProcessUserMessageUseCase {
  // 依存性注入
  - sessionRepository: InterviewSessionRepository     // Week 1で実装済み
  - conversationService: AIConversationService        // Week 2で実装済み
  - analysisService: ProcessAnalysisService          // Week 2で実装済み
  - rateLimitService: AIRateLimitService             // Week 3で実装済み
  - monitoringService: AIMonitoringService           // Week 3で実装済み
  
  // メインメソッド
  + execute(input: ProcessMessageInput): Promise<ProcessMessageOutput>
  
  // プライベートメソッド
  - validateInput(input: ProcessMessageInput): void
  - checkRateLimit(userId: number): Promise<void>
  - loadSession(sessionId: string): Promise<InterviewSession>
  - validateSession(session: InterviewSession): void
  - processMessage(session: InterviewSession, message: string): Promise<AIResponse>
  - extractRequirements(conversation: ConversationMessage[]): Promise<ProcessRequirement[]>
  - updateSession(session: InterviewSession): Promise<void>
  - handleOpenAIError(error: Error): Promise<AIResponse>
  - waitForRetry(backoffTime: number): Promise<void>
  - createFallbackResponse(): AIResponse
  - logUsage(userId: number, tokens: number, cost: number): void
}
```

#### 処理フロー（シーケンス図より）
1. 入力検証（sessionId, message必須）
2. レート制限チェック（100メッセージ/時間）
3. セッション取得・検証（有効性、期限チェック）
4. AIConversationService経由でOpenAIに問い合わせ
5. ProcessAnalysisServiceで要件抽出（非同期）
6. 会話履歴更新（PostgreSQL）
7. 要件情報更新（requirements配列に追加）
8. Redisキャッシュ更新
9. AIMonitoringServiceで使用統計記録
10. WebSocketで会話更新通知

### 3. エラーハンドリング実装

#### OpenAIエラー処理（設計書より）
```typescript
// ProcessUserMessageUseCase内
async handleOpenAIError(error: Error): Promise<AIResponse> {
  if (this.isRetryableError(error)) {
    const backoffTime = this.calculateBackoff(retryCount);
    await this.waitForRetry(backoffTime);
    return this.processMessage(session, message); // リトライ
  } else {
    return this.createFallbackResponse(); // フォールバック応答
  }
}
```

#### リトライ可能エラー
- Rate Limit Exceeded (429)
- Service Unavailable (503)
- Timeout

#### 非リトライエラー
- Invalid Request (400)
- Authentication Failed (401)
- Insufficient Quota (402)

### 4. DTOバリデーション実装

#### StartSessionDto
```typescript
class StartSessionDto {
  @IsNotEmpty()
  @IsString()
  industry: string;           // 必須: 業界

  @IsNotEmpty()
  @IsString()
  processType: string;        // 必須: プロセス種別

  @IsNotEmpty()
  @IsString()
  goal: string;              // 必須: 目標

  @IsOptional()
  @IsObject()
  additionalContext?: any;    // オプション: 追加コンテキスト
}
```

#### SendMessageDto
```typescript
class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;            // 必須: メッセージ（最大2000文字）

  @IsOptional()
  @IsObject()
  metadata?: any;             // オプション: メタデータ
}
```

### 5. WebSocket通知統合

#### セッション開始時
```typescript
// StartInterviewSessionUseCase内
this.socketGateway.notifySessionStatusChanged(sessionId, 'active');
```

#### メッセージ処理時
```typescript
// ProcessUserMessageUseCase内
this.socketGateway.broadcastConversationUpdate(sessionId, {
  message: userMessage,
  response: aiResponse,
  timestamp: new Date()
});
```

#### 要件抽出完了時
```typescript
// ProcessUserMessageUseCase内（非同期処理）
this.socketGateway.notifyRequirementsExtracted(sessionId, requirements);
```

## Week 5との統合ポイント

### 1. WebSocket通知の完全動作
Week 5で実装したWebSocket通知メソッドが、以下のタイミングで実際に呼び出されるようになります：
- セッション作成時: `notifySessionStatusChanged()`
- メッセージ処理時: `broadcastConversationUpdate()`
- 要件抽出完了時: `notifyRequirementsExtracted()`
- エラー発生時: `notifyError()`

### 2. バックグラウンドジョブとの連携
```typescript
// ProcessUserMessageUseCase内
await this.backgroundJobQueue.add(JobType.REQUIREMENT_ANALYSIS, {
  payload: {
    sessionId,
    conversation: updatedConversation,
    context: session.context
  }
});
```

### 3. E2Eテストの動作
Week 6実装完了後、Week 5のE2Eテストが以下の理由で動作するようになります：
- `InterviewSession`エンティティの永続化が可能
- セッションIDベースのルーム管理が機能
- ジョブ処理時にセッション情報が取得可能

## 依存関係の確認

### 使用する既存実装（Week 1-5）

#### Week 1（データベース層）
- `InterviewSessionRepository` - セッション永続化
- `InterviewSession`エンティティ - セッションデータ構造
- データベーステーブル: `ai_interview_sessions`

#### Week 2（ドメインサービス）
- `AIConversationService` - AI会話処理
- `ProcessAnalysisService` - プロセス要件分析
- `AIResponse`型定義

#### Week 3（インフラサービス）
- `OpenAIService` - OpenAI API連携
- `AIRateLimitService` - レート制限
- `AIMonitoringService` - 使用統計
- `AICacheService` - Redis キャッシュ
- `AIConfigService` - 設定管理

#### Week 4（WebSocket）
- `SocketGateway` - リアルタイム通知
- `SocketAuthGuard` - WebSocket認証
- 通知メソッド群

#### Week 5（バックグラウンドジョブ）
- `BackgroundJobQueue` - ジョブキュー
- `AIProcessingProcessor` - ジョブ処理
- `JobType`列挙型

## 実装優先順位

1. **DTOの定義**（すべてのDTOを先に作成）
2. **AIAgentController**の骨組み実装
3. **StartInterviewSessionUseCase**（セッション作成が最優先）
4. **GetInterviewSessionUseCase**（セッション取得）
5. **ProcessUserMessageUseCase**（メッセージ処理）
6. **GetConversationHistoryUseCase**（履歴取得）
7. **EndInterviewSessionUseCase**（セッション終了）
8. **CleanupExpiredSessionsUseCase**（期限切れ清理）

## テスト計画

### ユニットテスト
- 各UseCaseの正常系・異常系テスト
- DTOバリデーションテスト
- エラーハンドリングテスト

### 統合テスト
- Controller → UseCase → Repository の連携テスト
- WebSocket通知の発火確認
- バックグラウンドジョブのエンキュー確認

### E2Eテスト
- セッション作成 → メッセージ送信 → 応答受信のフロー
- WebSocket接続 → 通知受信の確認
- レート制限の動作確認

## 注意事項

1. **設計書の厳守**
   - クラス図、シーケンス図に記載されたメソッドのみ実装
   - 勝手なメソッド追加は禁止

2. **型定義の活用**
   - `ai_agent_enums_types.md`の型定義を使用
   - 新規型定義は避ける

3. **エラーハンドリング**
   - OpenAIエラーは必ずリトライ/フォールバック処理
   - ユーザーへのエラーメッセージは適切にサニタイズ

4. **パフォーマンス考慮**
   - 会話履歴はRedisキャッシュを優先使用
   - 要件抽出は非同期処理（バックグラウンドジョブ）

5. **セキュリティ**
   - セッションアクセスはユーザーIDで制限
   - レート制限の確実な実施

## まとめ

Week 6の実装により、AIエージェント機能の中核となるセッション管理とメッセージ処理が動作可能になります。これにより、Week 5で実装したWebSocketとバックグラウンドジョブが実際に機能し、リアルタイムの対話型AIアシスタントが実現されます。