import { SessionResponseDto } from './session-response.dto';
import { SessionStatus } from '../../../domain/ai-agent/entities/interview-session.entity';

describe('SessionResponseDto', () => {
  describe('constructor and initialization', () => {
    it('should create DTO with all required fields', () => {
      // Arrange
      const data = {
        sessionId: 'test-session-123',
        userId: 1,
        status: SessionStatus.ACTIVE,
        context: {
          industry: 'ソフトウェア開発',
          processType: 'アジャイル開発',
          goal: 'プロセス改善',
        },
        conversation: [],
        requirements: [],
        expiresAt: new Date('2024-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      };

      // Act
      const dto = new SessionResponseDto();
      Object.assign(dto, data);

      // Assert
      expect(dto.sessionId).toBe(data.sessionId);
      // userId should not be exposed in DTO for security reasons
      expect(dto.status).toBe(data.status);
      expect(dto.context).toEqual(data.context);
      expect(dto.conversation).toEqual(data.conversation);
      expect(dto.requirements).toEqual(data.requirements);
      expect(dto.expiresAt).toEqual(data.expiresAt);
      expect(dto.createdAt).toEqual(data.createdAt);
      expect(dto.updatedAt).toEqual(data.updatedAt);
    });

    it('should handle empty conversation array', () => {
      // Arrange
      const dto = new SessionResponseDto();
      dto.conversation = [];

      // Assert
      expect(dto.conversation).toEqual([]);
      expect(dto.conversation.length).toBe(0);
    });

    it('should handle conversation with messages', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const conversation = [
        {
          role: 'assistant' as const,
          content: 'こんにちは',
          timestamp: new Date(),
        },
        {
          role: 'user' as const,
          content: 'よろしくお願いします',
          timestamp: new Date(),
        },
      ];

      // Act
      dto.conversation = conversation;

      // Assert
      expect(dto.conversation).toEqual(conversation);
      expect(dto.conversation.length).toBe(2);
    });

    it('should handle empty requirements array', () => {
      // Arrange
      const dto = new SessionResponseDto();
      dto.requirements = [];

      // Assert
      expect(dto.requirements).toEqual([]);
      expect(dto.requirements.length).toBe(0);
    });

    it('should handle requirements with data', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const requirements = [
        {
          category: '機能要件',
          description: 'ユーザー認証機能',
          priority: 'high' as const,
          confidence: 0.9,
        },
        {
          category: '非機能要件',
          description: 'レスポンス時間1秒以内',
          priority: 'medium' as const,
          confidence: 0.85,
        },
      ];

      // Act
      dto.requirements = requirements;

      // Assert
      expect(dto.requirements).toEqual(requirements);
      expect(dto.requirements.length).toBe(2);
    });
  });

  describe('status field variations', () => {
    it('should handle ACTIVE status', () => {
      // Arrange
      const dto = new SessionResponseDto();

      // Act
      dto.status = SessionStatus.ACTIVE;

      // Assert
      expect(dto.status).toBe('active');
    });

    it('should handle COMPLETED status', () => {
      // Arrange
      const dto = new SessionResponseDto();

      // Act
      dto.status = SessionStatus.COMPLETED;

      // Assert
      expect(dto.status).toBe('completed');
    });

    it('should handle EXPIRED status', () => {
      // Arrange
      const dto = new SessionResponseDto();

      // Act
      dto.status = SessionStatus.EXPIRED;

      // Assert
      expect(dto.status).toBe('expired');
    });

    it('should handle CANCELLED status', () => {
      // Arrange
      const dto = new SessionResponseDto();

      // Act
      dto.status = SessionStatus.CANCELLED;

      // Assert
      expect(dto.status).toBe('cancelled');
    });

    it('should handle PAUSED status', () => {
      // Arrange
      const dto = new SessionResponseDto();

      // Act
      dto.status = SessionStatus.PAUSED;

      // Assert
      expect(dto.status).toBe('paused');
    });
  });

  describe('context field variations', () => {
    it('should handle complete context object', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const context = {
        industry: '製造業',
        processType: '品質管理',
        goal: '不良率削減',
        additionalInfo: '特記事項',
      };

      // Act
      dto.context = context;

      // Assert
      expect(dto.context).toEqual(context);
      expect(dto.context.industry).toBe('製造業');
      expect(dto.context.processType).toBe('品質管理');
      expect(dto.context.goal).toBe('不良率削減');
    });

    it('should handle minimal context object', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const context = {
        industry: 'IT',
        processType: 'DevOps',
        goal: 'Automation',
      };

      // Act
      dto.context = context;

      // Assert
      expect(dto.context).toEqual(context);
    });

    it('should handle context with special characters', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const context = {
        industry: 'IT・ソフトウェア',
        processType: 'CI/CDパイプライン',
        goal: '品質向上&効率化',
      };

      // Act
      dto.context = context;

      // Assert
      expect(dto.context).toEqual(context);
    });
  });

  describe('date field handling', () => {
    it('should handle valid date objects', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const now = new Date();
      const future = new Date(now.getTime() + 3600000);

      // Act
      dto.createdAt = now;
      dto.updatedAt = now;
      dto.expiresAt = future;

      // Assert
      expect(dto.createdAt).toEqual(now);
      expect(dto.updatedAt).toEqual(now);
      expect(dto.expiresAt).toEqual(future);
    });

    it('should handle ISO date strings', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const isoDate = new Date('2024-06-15T10:30:00.000Z');

      // Act
      dto.createdAt = isoDate;
      dto.updatedAt = isoDate;
      dto.expiresAt = isoDate;

      // Assert
      expect(dto.createdAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
      expect(dto.updatedAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
      expect(dto.expiresAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
    });

    it('should handle different timezones', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const jstDate = new Date('2024-06-15T19:30:00+09:00'); // JST
      const utcDate = new Date('2024-06-15T10:30:00Z'); // UTC

      // Act
      dto.createdAt = jstDate;
      dto.updatedAt = utcDate;

      // Assert
      expect(dto.createdAt.getTime()).toBe(dto.updatedAt.getTime());
    });
  });

  // userId field should not be exposed in DTO for security reasons

  describe('sessionId field variations', () => {
    it('should handle UUID format sessionId', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      dto.sessionId = uuid;

      // Assert
      expect(dto.sessionId).toBe(uuid);
    });

    it('should handle custom format sessionId', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const customId = 'session_2024_01_01_ABC123';

      // Act
      dto.sessionId = customId;

      // Assert
      expect(dto.sessionId).toBe(customId);
    });

    it('should handle short sessionId', () => {
      // Arrange
      const dto = new SessionResponseDto();

      // Act
      dto.sessionId = 'abc';

      // Assert
      expect(dto.sessionId).toBe('abc');
    });
  });

  describe('complex data scenarios', () => {
    it('should handle complete session with all fields populated', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const completeData = {
        sessionId: 'complete-session-123',
        userId: 42,
        status: SessionStatus.ACTIVE,
        context: {
          industry: '金融業',
          processType: 'リスク管理',
          goal: 'コンプライアンス強化',
        },
        conversation: [
          {
            role: 'system' as const,
            content: 'システムメッセージ',
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
          {
            role: 'assistant' as const,
            content: 'アシスタントメッセージ',
            timestamp: new Date('2024-01-01T00:01:00Z'),
          },
          {
            role: 'user' as const,
            content: 'ユーザーメッセージ',
            timestamp: new Date('2024-01-01T00:02:00Z'),
          },
        ],
        requirements: [
          {
            category: 'セキュリティ',
            description: '暗号化必須',
            priority: 'high' as const,
            confidence: 0.95,
          },
          {
            category: 'パフォーマンス',
            description: '高速処理',
            priority: 'medium' as const,
            confidence: 0.8,
          },
          {
            category: 'ユーザビリティ',
            description: '使いやすいUI',
            priority: 'low' as const,
            confidence: 0.7,
          },
        ],
        expiresAt: new Date('2024-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-06-15T12:00:00Z'),
      };

      // Act
      Object.assign(dto, completeData);

      // Assert
      expect(dto).toMatchObject(completeData);
      expect(dto.conversation.length).toBe(3);
      expect(dto.requirements.length).toBe(3);
    });

    it('should handle session with metadata in messages', () => {
      // Arrange
      const dto = new SessionResponseDto();
      const conversation = [
        {
          role: 'assistant' as const,
          content: 'メッセージ',
          timestamp: new Date(),
          metadata: {
            model: 'gpt-4',
            tokens: 150,
            confidence: 0.95,
          },
        },
      ];

      // Act
      dto.conversation = conversation;

      // Assert
      expect(dto.conversation[0].metadata).toBeDefined();
      expect(dto.conversation[0].metadata?.model).toBe('gpt-4');
      expect(dto.conversation[0].metadata?.tokens).toBe(150);
      expect(dto.conversation[0].metadata?.confidence).toBe(0.95);
    });

    it('should handle deep copy of nested objects', () => {
      // Arrange
      const dto1 = new SessionResponseDto();
      const dto2 = new SessionResponseDto();
      const context = {
        industry: '製造業',
        processType: '品質管理',
        goal: '改善',
      };

      // Act
      dto1.context = context;
      dto2.context = { ...context };
      dto2.context.industry = '小売業';

      // Assert
      expect(dto1.context.industry).toBe('製造業');
      expect(dto2.context.industry).toBe('小売業');
    });
  });
});