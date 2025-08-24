# Week 6 テストコード仕様書

## 概要
Week 6実装（インタビューセッション管理、メッセージ処理）に対する包括的なテスト仕様を定義します。設計書および実装コードの深い分析に基づき、単体テスト、統合テスト、E2Eテストの詳細仕様を規定します。

## テスト対象範囲

### 1. Use Cases（8ファイル）
- StartInterviewSessionUseCase
- GetInterviewSessionUseCase
- EndInterviewSessionUseCase
- ProcessUserMessageUseCase
- GetConversationHistoryUseCase
- CleanupExpiredSessionsUseCase

### 2. DTOs（6ファイル）
- StartSessionDto
- SessionResponseDto
- SessionContextDto
- SendMessageDto
- MessageResponseDto
- RequirementExtractionDto

### 3. Controller（1ファイル）
- AIAgentController

## 詳細テスト仕様

### 1. StartInterviewSessionUseCase テスト仕様

#### ファイル: `start-interview-session.usecase.spec.ts`

#### テストケース設計

##### 1.1 正常系テスト
```typescript
describe('StartInterviewSessionUseCase', () => {
  describe('execute', () => {
    it('should create a new session successfully', async () => {
      // 検証項目:
      // - SessionIdがUUID v4形式であること
      // - StatusがACTIVEであること
      // - ExpiresAtが2時間後であること
      // - WelcomeMessageが生成されること
      // - ConversationにwelcomeMessageが含まれること
      // - WebSocket通知が送信されること
      // - Redisキャッシュに保存されること
    });

    it('should generate context-specific welcome message', async () => {
      // 検証項目:
      // - industryに応じたメッセージ生成
      // - processTypeに応じたメッセージ生成
      // - goalが反映されたメッセージ生成
    });

    it('should include suggested questions in response', async () => {
      // 検証項目:
      // - suggestedQuestionsが配列であること
      // - 最低3つの質問が含まれること
      // - 質問がコンテキストに関連していること
    });
  });
});
```

##### 1.2 異常系テスト
```typescript
describe('error handling', () => {
  it('should throw error when userId is missing', async () => {
    // 期待エラー: DomainException('User ID is required')
  });

  it('should throw error when industry is empty', async () => {
    // 期待エラー: DomainException('Industry is required')
  });

  it('should throw error when processType is empty', async () => {
    // 期待エラー: DomainException('Process type is required')
  });

  it('should throw error when goal is empty', async () => {
    // 期待エラー: DomainException('Goal is required')
  });

  it('should throw error when industry exceeds 100 characters', async () => {
    // 期待エラー: DomainException('Industry must be less than 100 characters')
  });

  it('should throw error when goal exceeds 500 characters', async () => {
    // 期待エラー: DomainException('Goal must be less than 500 characters')
  });

  it('should throw error when rate limit exceeded', async () => {
    // 期待エラー: DomainException('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED')
    // 検証: 1ユーザー5セッション/日の制限
  });

  it('should handle AIConversationService failure gracefully', async () => {
    // OpenAI APIエラー時の処理
    // フォールバックメッセージの生成
  });
});
```

##### 1.3 モック設定
```typescript
const mockDependencies = {
  sessionRepository: {
    save: jest.fn().mockResolvedValue(mockSession)
  },
  conversationService: {
    initializeSession: jest.fn().mockResolvedValue(mockConversationSession),
    generateWelcomeMessage: jest.fn().mockResolvedValue('Welcome message')
  },
  configService: {
    getSessionRateLimit: jest.fn().mockReturnValue({ maxSessions: 5, windowMs: 86400000 })
  },
  rateLimitService: {
    checkRateLimit: jest.fn().mockResolvedValue(true)
  },
  cacheService: {
    cacheConversation: jest.fn().mockResolvedValue(undefined)
  },
  socketGateway: {
    notifySessionStatusChanged: jest.fn()
  }
};
```

### 2. ProcessUserMessageUseCase テスト仕様

#### ファイル: `process-user-message.usecase.spec.ts`

#### テストケース設計

##### 2.1 正常系テスト
```typescript
describe('ProcessUserMessageUseCase', () => {
  describe('execute', () => {
    it('should process user message successfully', async () => {
      // 検証項目:
      // - AI応答が生成されること
      // - ConversationにユーザーメッセージとAI応答が追加されること
      // - バックグラウンドジョブがエンキューされること
      // - WebSocket通知が送信されること
      // - 使用統計がログされること
    });

    it('should extract requirements asynchronously', async () => {
      // 検証項目:
      // - REQUIREMENT_ANALYSISジョブがキューに追加されること
      // - ジョブペイロードにsessionId, conversation, contextが含まれること
    });

    it('should calculate conversation progress', async () => {
      // 検証項目:
      // - completenessが0-100の範囲であること
      // - missingAreasが配列であること
    });
  });
});
```

##### 2.2 異常系テスト
```typescript
describe('error handling', () => {
  it('should throw error when session not found', async () => {
    // 期待エラー: DomainException('Session not found', 'SESSION_NOT_FOUND')
  });

  it('should throw error when user does not own session', async () => {
    // 期待エラー: DomainException('Session not found or access denied', 'SESSION_NOT_FOUND')
  });

  it('should throw error when session is not active', async () => {
    // 期待エラー: DomainException('Session is {status}. Only active sessions can receive messages.', 'SESSION_INACTIVE')
  });

  it('should throw error when session is expired', async () => {
    // 期待エラー: DomainException('Session has expired', 'SESSION_EXPIRED')
  });

  it('should throw error when message is empty', async () => {
    // 期待エラー: DomainException('Message is required')
  });

  it('should throw error when message exceeds 2000 characters', async () => {
    // 期待エラー: DomainException('Message must be less than 2000 characters')
  });

  it('should throw error when rate limit exceeded', async () => {
    // 期待エラー: DomainException('Rate limit exceeded. Maximum 100 messages per hour.', 'RATE_LIMIT_EXCEEDED')
  });
});
```

##### 2.3 OpenAIエラーハンドリングテスト
```typescript
describe('OpenAI error handling', () => {
  it('should retry on rate limit error (429)', async () => {
    // 検証:
    // - 指数バックオフでリトライされること
    // - 最大3回リトライされること
    // - 成功時は正常な応答が返ること
  });

  it('should retry on service unavailable (503)', async () => {
    // 検証: リトライ処理
  });

  it('should retry on timeout error', async () => {
    // 検証: リトライ処理
  });

  it('should return fallback response on non-retryable error', async () => {
    // 検証:
    // - 400, 401, 402エラーではリトライしないこと
    // - フォールバック応答が返ること
    // - フォールバック応答にsuggestedQuestionsが含まれること
  });

  it('should calculate exponential backoff correctly', async () => {
    // 検証:
    // - 1回目: 1秒
    // - 2回目: 2秒
    // - 3回目: 4秒
    // - 最大30秒を超えないこと
  });
});
```

### 3. CleanupExpiredSessionsUseCase テスト仕様

#### ファイル: `cleanup-expired-sessions.usecase.spec.ts`

#### テストケース設計

##### 3.1 自動実行テスト
```typescript
describe('CleanupExpiredSessionsUseCase', () => {
  describe('scheduled execution', () => {
    it('should run cleanup every hour', async () => {
      // 検証:
      // - @Cron(CronExpression.EVERY_HOUR)が設定されていること
      // - 1時間ごとに実行されること
    });
  });

  describe('execute', () => {
    it('should mark expired sessions as EXPIRED', async () => {
      // 検証:
      // - findExpiredSessions()が呼ばれること
      // - 各セッションでmarkAsExpired()が呼ばれること
      // - キャッシュがクリアされること
      // - WebSocket通知が送信されること
    });

    it('should delete old expired sessions', async () => {
      // 検証:
      // - deleteExpiredSessions()が呼ばれること
      // - 削除数が返されること
    });

    it('should handle empty expired sessions list', async () => {
      // 検証:
      // - cleanedCount: 0が返されること
      // - エラーが発生しないこと
    });

    it('should continue cleanup even if one session fails', async () => {
      // 検証:
      // - 1つのセッションでエラーが発生しても継続すること
      // - エラーがログされること
    });
  });
});
```

##### 3.2 手動クリーンアップテスト
```typescript
describe('manual cleanup', () => {
  it('should cleanup specific session manually', async () => {
    // 検証:
    // - markAsExpired()が呼ばれること
    // - キャッシュがクリアされること
    // - WebSocket通知が送信されること
  });

  it('should handle non-existent session gracefully', async () => {
    // 検証: エラーが発生しないこと
  });
});
```

### 4. DTOバリデーションテスト仕様

#### ファイル: `dto-validation.spec.ts`

##### 4.1 StartSessionDto
```typescript
describe('StartSessionDto validation', () => {
  it('should validate required fields', async () => {
    // industry, processType, goalが必須
  });

  it('should validate field lengths', async () => {
    // industry, processType: 最大100文字
    // goal: 最大500文字
  });

  it('should accept optional additionalContext', async () => {
    // additionalContextは任意のオブジェクト
  });
});
```

##### 4.2 SendMessageDto
```typescript
describe('SendMessageDto validation', () => {
  it('should validate message is required', async () => {
    // messageが必須
  });

  it('should validate message length', async () => {
    // 最大2000文字
  });

  it('should accept optional metadata', async () => {
    // metadataは任意のオブジェクト
  });
});
```

### 5. Controller統合テスト仕様

#### ファイル: `ai-agent.controller.spec.ts`

##### 5.1 エンドポイントテスト
```typescript
describe('AIAgentController', () => {
  describe('POST /api/ai-agent/sessions', () => {
    it('should return 201 with session data', async () => {
      // 検証:
      // - HTTPステータス201
      // - SessionResponseDtoの形式
      // - JWTガードが適用されていること
    });

    it('should return 429 when rate limit exceeded', async () => {
      // 検証: HTTPステータス429
    });

    it('should return 400 for invalid input', async () => {
      // 検証: バリデーションエラー
    });
  });

  describe('GET /api/ai-agent/sessions/:sessionId', () => {
    it('should return 200 with session data', async () => {
      // 検証: SessionResponseDto
    });

    it('should return 404 when session not found', async () => {
      // 検証: HTTPステータス404
    });

    it('should return 403 when user does not own session', async () => {
      // 検証: アクセス拒否
    });
  });

  describe('POST /api/ai-agent/sessions/:sessionId/messages', () => {
    it('should return 200 with message response', async () => {
      // 検証: MessageResponseDto
    });

    it('should return 404 when session not found', async () => {
      // 検証: HTTPステータス404
    });

    it('should return 429 when rate limit exceeded', async () => {
      // 検証: HTTPステータス429
    });
  });
});
```

### 6. E2Eテスト仕様

#### ファイル: `ai-agent.e2e-spec.ts`

##### 6.1 完全フローテスト
```typescript
describe('AI Agent E2E Tests', () => {
  describe('Complete interview flow', () => {
    it('should complete full interview session', async () => {
      // ステップ:
      // 1. セッション作成
      // 2. 複数メッセージ送信
      // 3. 会話履歴取得
      // 4. セッション終了
      // 検証: 各ステップの応答とデータ整合性
    });
  });

  describe('WebSocket integration', () => {
    it('should receive real-time notifications', async () => {
      // ステップ:
      // 1. WebSocket接続
      // 2. セッション作成
      // 3. メッセージ送信
      // 検証: WebSocket通知の受信
    });
  });

  describe('Background job processing', () => {
    it('should process requirement extraction job', async () => {
      // ステップ:
      // 1. メッセージ送信
      // 2. ジョブ処理待機
      // 検証: 要件抽出結果の確認
    });
  });

  describe('Session expiration', () => {
    it('should expire session after timeout', async () => {
      // ステップ:
      // 1. セッション作成
      // 2. 2時間待機（タイムトラベル）
      // 3. メッセージ送信試行
      // 検証: SESSION_EXPIREDエラー
    });
  });
});
```

## パフォーマンステスト仕様

### 応答時間要件
```typescript
describe('Performance Tests', () => {
  it('should create session within 2 seconds', async () => {
    // OpenAI API呼び出しを含む
  });

  it('should process message within 3 seconds', async () => {
    // OpenAI API呼び出しを含む
  });

  it('should retrieve session within 100ms', async () => {
    // キャッシュヒット時
  });

  it('should handle 100 concurrent sessions', async () => {
    // 並行セッション処理
  });
});
```

## テストデータ仕様

### モックデータファクトリー
```typescript
class TestDataFactory {
  static createMockSession() {
    return new InterviewSession({
      sessionId: 'test-session-123',
      userId: 1,
      status: SessionStatus.ACTIVE,
      context: {
        industry: 'software_development',
        processType: 'project_management',
        goal: 'Create efficient development process'
      },
      conversation: [],
      extractedRequirements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    });
  }

  static createMockConversationMessage() {
    return {
      role: 'user',
      content: 'Test message',
      timestamp: new Date()
    };
  }

  static createMockAIResponse() {
    return {
      content: 'AI response',
      suggestedQuestions: ['Question 1', 'Question 2'],
      confidence: 0.85,
      tokenCount: 150,
      estimatedCost: 0.003
    };
  }
}
```

## カバレッジ要件

### 目標カバレッジ
- **Line Coverage**: 90%以上
- **Branch Coverage**: 85%以上
- **Function Coverage**: 95%以上
- **Statement Coverage**: 90%以上

### 重点カバレッジ領域
1. **エラーハンドリングパス**: 100%
2. **バリデーションロジック**: 100%
3. **レート制限チェック**: 100%
4. **OpenAIエラーリトライ**: 100%

## テスト実行環境

### 環境変数設定
```env
# テスト環境設定
NODE_ENV=test
JWT_SECRET=test-secret
OPENAI_API_KEY=test-key
REDIS_HOST=localhost
REDIS_PORT=6379
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
```

### Docker Compose設定
```yaml
version: '3.8'
services:
  test-db:
    image: postgres:14
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
  
  test-redis:
    image: redis:7
    ports:
      - "6379:6379"
```

## CI/CD統合

### GitHub Actions設定
```yaml
name: Test Suite
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## テスト実行コマンド

```bash
# 単体テスト
npm run test:unit

# 特定ファイルのテスト
npm run test:unit -- start-interview-session.usecase.spec.ts

# カバレッジ付き実行
npm run test:coverage

# E2Eテスト
npm run test:e2e

# ウォッチモード
npm run test:watch

# デバッグモード
npm run test:debug
```

## まとめ

Week 6のテスト仕様は、実装されたすべての機能に対して包括的なテストケースを定義しています。特に重要な点：

1. **エラーハンドリングの完全性**: すべてのエラーケースをカバー
2. **OpenAI統合の信頼性**: リトライ、フォールバック処理を詳細にテスト
3. **リアルタイム機能**: WebSocket通知、バックグラウンドジョブの統合テスト
4. **パフォーマンス**: 応答時間、並行処理の検証

これらのテストにより、AIエージェント機能の品質と信頼性を確保します。