import { ConversationHistoryDto } from './conversation-history.dto';

describe('ConversationHistoryDto', () => {
  describe('constructor and initialization', () => {
    it('should create DTO with all required fields', () => {
      // Arrange
      const data = {
        sessionId: 'test-session-123',
        messages: [],
        totalMessages: 0,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        lastMessageAt: new Date('2024-01-01T12:00:00Z'),
      };

      // Act
      const dto = new ConversationHistoryDto();
      Object.assign(dto, data);

      // Assert
      expect(dto.sessionId).toBe(data.sessionId);
      expect(dto.messages).toEqual(data.messages);
      expect(dto.totalMessages).toBe(data.totalMessages);
      expect(dto.startedAt).toEqual(data.startedAt);
      expect(dto.lastMessageAt).toEqual(data.lastMessageAt);
    });

    it('should handle empty messages array', () => {
      // Arrange
      const dto = new ConversationHistoryDto();

      // Act
      dto.messages = [];

      // Assert
      expect(dto.messages).toEqual([]);
      expect(dto.messages.length).toBe(0);
    });

    it('should handle messages with various roles', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'system' as const,
          content: 'システム初期化',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          role: 'assistant' as const,
          content: 'こんにちは',
          timestamp: new Date('2024-01-01T00:00:10Z'),
        },
        {
          role: 'user' as const,
          content: 'よろしくお願いします',
          timestamp: new Date('2024-01-01T00:00:20Z'),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages).toEqual(messages);
      expect(dto.messages.length).toBe(3);
      expect(dto.messages[0].role).toBe('system');
      expect(dto.messages[1].role).toBe('assistant');
      expect(dto.messages[2].role).toBe('user');
    });
  });

  describe('message content variations', () => {
    it('should handle short messages', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: 'OK',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].content).toBe('OK');
    });

    it('should handle long messages', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const longContent = 'a'.repeat(2000);
      const messages = [
        {
          role: 'user' as const,
          content: longContent,
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].content).toBe(longContent);
      expect(dto.messages[0].content.length).toBe(2000);
    });

    it('should handle messages with special characters', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: '特殊文字テスト: @#$%^&*()_+{}[]|\\:";\'<>?,./~`',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].content).toContain('@#$%^&*()');
    });

    it('should handle messages with newlines', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'assistant' as const,
          content: '複数行の\nメッセージ\nテスト',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].content).toContain('\n');
      expect(dto.messages[0].content.split('\n').length).toBe(3);
    });

    it('should handle messages with emoji', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: '絵文字テスト 😊 🚀 💡',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].content).toContain('😊');
      expect(dto.messages[0].content).toContain('🚀');
      expect(dto.messages[0].content).toContain('💡');
    });
  });

  describe('metadata handling', () => {
    it('should handle messages without metadata', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: 'メッセージ',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].metadata).toBeUndefined();
    });

    it('should handle messages with metadata', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'assistant' as const,
          content: 'AIレスポンス',
          timestamp: new Date(),
          metadata: {
            model: 'gpt-4',
            tokens: 250,
            temperature: 0.7,
          },
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].metadata).toBeDefined();
      expect(dto.messages[0].metadata?.model).toBe('gpt-4');
      expect(dto.messages[0].metadata?.tokens).toBe(250);
      expect(dto.messages[0].metadata?.temperature).toBe(0.7);
    });

    it('should handle mixed messages with and without metadata', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: 'ユーザー入力',
          timestamp: new Date(),
        },
        {
          role: 'assistant' as const,
          content: 'AI応答',
          timestamp: new Date(),
          metadata: { confidence: 0.95 },
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].metadata).toBeUndefined();
      expect(dto.messages[1].metadata).toBeDefined();
      expect(dto.messages[1].metadata?.confidence).toBe(0.95);
    });

    it('should handle complex metadata structures', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'assistant' as const,
          content: 'Complex metadata',
          timestamp: new Date(),
          metadata: {
            processing: {
              startTime: '2024-01-01T00:00:00Z',
              endTime: '2024-01-01T00:00:01Z',
              duration: 1000,
            },
            model: {
              name: 'gpt-4',
              version: '0613',
              parameters: {
                temperature: 0.7,
                max_tokens: 500,
              },
            },
            usage: {
              prompt_tokens: 100,
              completion_tokens: 150,
              total_tokens: 250,
            },
          },
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].metadata?.processing?.duration).toBe(1000);
      expect(dto.messages[0].metadata?.model?.parameters?.temperature).toBe(0.7);
      expect(dto.messages[0].metadata?.usage?.total_tokens).toBe(250);
    });
  });

  describe('timestamp handling', () => {
    it('should handle timestamps in chronological order', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const baseTime = new Date('2024-01-01T00:00:00Z');
      const messages = [
        {
          role: 'assistant' as const,
          content: 'First',
          timestamp: new Date(baseTime),
        },
        {
          role: 'user' as const,
          content: 'Second',
          timestamp: new Date(baseTime.getTime() + 1000),
        },
        {
          role: 'assistant' as const,
          content: 'Third',
          timestamp: new Date(baseTime.getTime() + 2000),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].timestamp < dto.messages[1].timestamp).toBe(true);
      expect(dto.messages[1].timestamp < dto.messages[2].timestamp).toBe(true);
    });

    it('should handle timestamps with millisecond precision', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const preciseTime = new Date('2024-01-01T12:34:56.789Z');
      const messages = [
        {
          role: 'user' as const,
          content: 'Precise timing',
          timestamp: preciseTime,
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].timestamp.getMilliseconds()).toBe(789);
    });

    it('should handle startedAt and lastMessageAt relationship', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const startTime = new Date('2024-01-01T00:00:00Z');
      const lastTime = new Date('2024-01-01T01:00:00Z');

      // Act
      dto.startedAt = startTime;
      dto.lastMessageAt = lastTime;

      // Assert
      expect(dto.lastMessageAt > dto.startedAt).toBe(true);
      expect(dto.lastMessageAt.getTime() - dto.startedAt.getTime()).toBe(3600000); // 1 hour
    });

    it('should handle same timestamp for startedAt and lastMessageAt when no messages', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const sameTime = new Date('2024-01-01T00:00:00Z');

      // Act
      dto.startedAt = sameTime;
      dto.lastMessageAt = sameTime;
      dto.messages = [];
      dto.totalMessages = 0;

      // Assert
      expect(dto.startedAt).toEqual(dto.lastMessageAt);
      expect(dto.totalMessages).toBe(0);
    });
  });

  describe('totalMessages field', () => {
    it('should correctly reflect message count', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        { role: 'assistant' as const, content: 'Msg1', timestamp: new Date() },
        { role: 'user' as const, content: 'Msg2', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Msg3', timestamp: new Date() },
      ];

      // Act
      dto.messages = messages;
      dto.totalMessages = messages.length;

      // Assert
      expect(dto.totalMessages).toBe(3);
      expect(dto.totalMessages).toBe(dto.messages.length);
    });

    it('should handle zero messages', () => {
      // Arrange
      const dto = new ConversationHistoryDto();

      // Act
      dto.messages = [];
      dto.totalMessages = 0;

      // Assert
      expect(dto.totalMessages).toBe(0);
    });

    it('should handle large message count', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? ('assistant' as const) : ('user' as const),
        content: `Message ${i}`,
        timestamp: new Date(),
      }));

      // Act
      dto.messages = messages;
      dto.totalMessages = 100;

      // Assert
      expect(dto.totalMessages).toBe(100);
    });
  });

  describe('sessionId variations', () => {
    it('should handle UUID format sessionId', () => {
      // Arrange
      const dto = new ConversationHistoryDto();

      // Act
      dto.sessionId = '550e8400-e29b-41d4-a716-446655440000';

      // Assert
      expect(dto.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should handle custom format sessionId', () => {
      // Arrange
      const dto = new ConversationHistoryDto();

      // Act
      dto.sessionId = 'session_2024_USER_123';

      // Assert
      expect(dto.sessionId).toBe('session_2024_USER_123');
    });

    it('should handle short sessionId', () => {
      // Arrange
      const dto = new ConversationHistoryDto();

      // Act
      dto.sessionId = 'S123';

      // Assert
      expect(dto.sessionId).toBe('S123');
    });
  });

  describe('complex conversation scenarios', () => {
    it('should handle complete conversation flow', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const startTime = new Date('2024-01-01T00:00:00Z');
      const conversation = [
        {
          role: 'system' as const,
          content: 'インタビューセッションを開始します',
          timestamp: new Date(startTime),
        },
        {
          role: 'assistant' as const,
          content: 'こんにちは。プロセス改善についてお聞きします。',
          timestamp: new Date(startTime.getTime() + 1000),
        },
        {
          role: 'user' as const,
          content: '現在の開発プロセスに課題があります。',
          timestamp: new Date(startTime.getTime() + 5000),
        },
        {
          role: 'assistant' as const,
          content: '具体的にどのような課題がありますか？',
          timestamp: new Date(startTime.getTime() + 6000),
        },
        {
          role: 'user' as const,
          content: 'リリースまでの時間が長すぎます。',
          timestamp: new Date(startTime.getTime() + 10000),
        },
      ];

      // Act
      dto.sessionId = 'conversation-flow-test';
      dto.messages = conversation;
      dto.totalMessages = conversation.length;
      dto.startedAt = startTime;
      dto.lastMessageAt = conversation[conversation.length - 1].timestamp;

      // Assert
      expect(dto.messages.length).toBe(5);
      expect(dto.totalMessages).toBe(5);
      expect(dto.messages[0].role).toBe('system');
      expect(dto.messages[dto.messages.length - 1].role).toBe('user');
      expect(dto.lastMessageAt.getTime() - dto.startedAt.getTime()).toBe(10000);
    });

    it('should handle conversation with error recovery', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: 'エラーが発生しました',
          timestamp: new Date(),
        },
        {
          role: 'assistant' as const,
          content: 'エラーから復旧しました。続けましょう。',
          timestamp: new Date(),
          metadata: {
            error_recovered: true,
            retry_count: 2,
          },
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[1].metadata?.error_recovered).toBe(true);
      expect(dto.messages[1].metadata?.retry_count).toBe(2);
    });

    it('should handle multi-language conversation', () => {
      // Arrange
      const dto = new ConversationHistoryDto();
      const messages = [
        {
          role: 'user' as const,
          content: '日本語で質問します',
          timestamp: new Date(),
        },
        {
          role: 'assistant' as const,
          content: 'I can respond in English too',
          timestamp: new Date(),
        },
        {
          role: 'user' as const,
          content: '中文也可以吗？',
          timestamp: new Date(),
        },
        {
          role: 'assistant' as const,
          content: 'نعم، يمكنني التحدث بلغات متعددة',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.messages = messages;

      // Assert
      expect(dto.messages[0].content).toContain('日本語');
      expect(dto.messages[1].content).toContain('English');
      expect(dto.messages[2].content).toContain('中文');
      expect(dto.messages[3].content).toContain('يمكنني');
    });

    it('should handle deep copy of messages array', () => {
      // Arrange
      const dto1 = new ConversationHistoryDto();
      const dto2 = new ConversationHistoryDto();
      const originalMessages = [
        {
          role: 'user' as const,
          content: 'Original',
          timestamp: new Date(),
        },
      ];

      // Act
      dto1.messages = originalMessages;
      dto2.messages = [...originalMessages];
      dto2.messages[0] = { ...dto2.messages[0], content: 'Modified' };

      // Assert
      expect(dto1.messages[0].content).toBe('Original');
      expect(dto2.messages[0].content).toBe('Modified');
    });
  });
});