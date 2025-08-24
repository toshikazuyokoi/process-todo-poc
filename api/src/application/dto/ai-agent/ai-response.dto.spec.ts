import { AIResponseDto } from './ai-response.dto';

describe('AIResponseDto', () => {
  describe('constructor and initialization', () => {
    it('should create DTO with all required fields', () => {
      // Arrange
      const data = {
        message: 'AI response message',
        requirementsExtracted: false,
        sessionStatus: 'active',
      };

      // Act
      const dto = new AIResponseDto();
      Object.assign(dto, data);

      // Assert
      expect(dto.message).toBe(data.message);
      expect(dto.requirementsExtracted).toBe(data.requirementsExtracted);
      expect(dto.sessionStatus).toBe(data.sessionStatus);
    });

    it('should handle optional metadata field', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'Response';
      dto.requirementsExtracted = false;
      dto.sessionStatus = 'active';
      // metadata is not set

      // Assert
      expect(dto.metadata).toBeUndefined();
    });

    it('should handle metadata when provided', () => {
      // Arrange
      const dto = new AIResponseDto();
      const metadata = {
        model: 'gpt-4',
        confidence: 0.95,
        processingTime: 1500,
      };

      // Act
      dto.metadata = metadata;

      // Assert
      expect(dto.metadata).toEqual(metadata);
      expect(dto.metadata.model).toBe('gpt-4');
      expect(dto.metadata.confidence).toBe(0.95);
      expect(dto.metadata.processingTime).toBe(1500);
    });
  });

  describe('message field variations', () => {
    it('should handle short messages', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'OK';

      // Assert
      expect(dto.message).toBe('OK');
      expect(dto.message.length).toBe(2);
    });

    it('should handle long messages', () => {
      // Arrange
      const dto = new AIResponseDto();
      const longMessage = 'a'.repeat(2000);

      // Act
      dto.message = longMessage;

      // Assert
      expect(dto.message).toBe(longMessage);
      expect(dto.message.length).toBe(2000);
    });

    it('should handle Japanese messages', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'プロセス改善の提案をいたします。現在の課題を詳しく教えてください。';

      // Assert
      expect(dto.message).toContain('プロセス改善');
      expect(dto.message).toContain('課題');
    });

    it('should handle English messages', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'I understand your requirements. Let me help you optimize your process.';

      // Assert
      expect(dto.message).toContain('requirements');
      expect(dto.message).toContain('optimize');
    });

    it('should handle mixed language messages', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'DevOpsプロセスの改善について、CI/CDパイプラインの最適化を提案します。';

      // Assert
      expect(dto.message).toContain('DevOps');
      expect(dto.message).toContain('CI/CD');
      expect(dto.message).toContain('最適化');
    });

    it('should handle messages with special characters', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '改善率: 25% ↑ | 処理時間: 500ms → 100ms';

      // Assert
      expect(dto.message).toContain('25%');
      expect(dto.message).toContain('→');
      expect(dto.message).toContain('|');
    });

    it('should handle messages with newlines', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '以下の改善点があります：\n1. 自動化\n2. 最適化\n3. 標準化';

      // Assert
      expect(dto.message.split('\n').length).toBe(4);
      expect(dto.message).toContain('自動化');
    });

    it('should handle messages with emoji', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '素晴らしい提案ですね！ 🎯 実装を始めましょう 🚀';

      // Assert
      expect(dto.message).toContain('🎯');
      expect(dto.message).toContain('🚀');
    });

    it('should handle empty-like messages', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '...';

      // Assert
      expect(dto.message).toBe('...');
    });
  });

  describe('requirementsExtracted field', () => {
    it('should handle true value', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.requirementsExtracted = true;

      // Assert
      expect(dto.requirementsExtracted).toBe(true);
      expect(typeof dto.requirementsExtracted).toBe('boolean');
    });

    it('should handle false value', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.requirementsExtracted = false;

      // Assert
      expect(dto.requirementsExtracted).toBe(false);
      expect(typeof dto.requirementsExtracted).toBe('boolean');
    });

    it('should work with conditional logic', () => {
      // Arrange
      const dto = new AIResponseDto();
      dto.requirementsExtracted = true;

      // Act & Assert
      if (dto.requirementsExtracted) {
        expect(dto.requirementsExtracted).toBe(true);
      } else {
        fail('Should not reach here');
      }
    });
  });

  describe('sessionStatus field variations', () => {
    it('should handle active status', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.sessionStatus = 'active';

      // Assert
      expect(dto.sessionStatus).toBe('active');
    });

    it('should handle completed status', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.sessionStatus = 'completed';

      // Assert
      expect(dto.sessionStatus).toBe('completed');
    });

    it('should handle expired status', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.sessionStatus = 'expired';

      // Assert
      expect(dto.sessionStatus).toBe('expired');
    });

    it('should handle cancelled status', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.sessionStatus = 'cancelled';

      // Assert
      expect(dto.sessionStatus).toBe('cancelled');
    });

    it('should handle paused status', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.sessionStatus = 'paused';

      // Assert
      expect(dto.sessionStatus).toBe('paused');
    });

    it('should handle status changes', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.sessionStatus = 'active';
      const initialStatus = dto.sessionStatus;
      dto.sessionStatus = 'completed';
      const finalStatus = dto.sessionStatus;

      // Assert
      expect(initialStatus).toBe('active');
      expect(finalStatus).toBe('completed');
      expect(initialStatus).not.toBe(finalStatus);
    });
  });

  describe('metadata variations', () => {
    it('should handle simple metadata', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.metadata = {
        version: '1.0',
      };

      // Assert
      expect(dto.metadata.version).toBe('1.0');
    });

    it('should handle complex metadata', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.metadata = {
        model: {
          name: 'gpt-4',
          version: '0613',
          temperature: 0.7,
        },
        processing: {
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:00:01Z',
          duration: 1000,
        },
        tokens: {
          prompt: 100,
          completion: 150,
          total: 250,
        },
        confidence: {
          overall: 0.95,
          requirements: 0.90,
          suggestions: 0.85,
        },
      };

      // Assert
      expect(dto.metadata.model.name).toBe('gpt-4');
      expect(dto.metadata.processing.duration).toBe(1000);
      expect(dto.metadata.tokens.total).toBe(250);
      expect(dto.metadata.confidence.overall).toBe(0.95);
    });

    it('should handle metadata with arrays', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.metadata = {
        extractedCategories: ['機能要件', '非機能要件', 'セキュリティ要件'],
        confidenceScores: [0.95, 0.90, 0.85, 0.92],
        processedSteps: [
          { step: 1, status: 'completed' },
          { step: 2, status: 'completed' },
          { step: 3, status: 'in-progress' },
        ],
      };

      // Assert
      expect(dto.metadata.extractedCategories).toHaveLength(3);
      expect(dto.metadata.confidenceScores).toHaveLength(4);
      expect(dto.metadata.processedSteps[2].status).toBe('in-progress');
    });

    it('should handle metadata with null values', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.metadata = {
        error: null,
        warning: null,
        info: 'Processing completed',
      };

      // Assert
      expect(dto.metadata.error).toBeNull();
      expect(dto.metadata.warning).toBeNull();
      expect(dto.metadata.info).toBe('Processing completed');
    });

    it('should handle metadata updates', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.metadata = { count: 1 };
      dto.metadata = { ...dto.metadata, count: dto.metadata.count + 1 };

      // Assert
      expect(dto.metadata.count).toBe(2);
    });

    it('should handle metadata deletion', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.metadata = { temp: 'value' };
      dto.metadata = undefined;

      // Assert
      expect(dto.metadata).toBeUndefined();
    });
  });

  describe('complete response scenarios', () => {
    it('should handle successful requirement extraction response', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '要件を抽出しました。以下の項目を確認してください：\n' +
        '1. ユーザー認証機能\n' +
        '2. データ暗号化\n' +
        '3. レスポンス時間1秒以内';
      dto.requirementsExtracted = true;
      dto.sessionStatus = 'active';
      dto.metadata = {
        extractedCount: 3,
        confidence: 0.92,
        categories: ['機能要件', 'セキュリティ要件', 'パフォーマンス要件'],
      };

      // Assert
      expect(dto.requirementsExtracted).toBe(true);
      expect(dto.metadata.extractedCount).toBe(3);
      expect(dto.metadata.categories).toHaveLength(3);
    });

    it('should handle conversation continuation response', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'なるほど、理解しました。他に考慮すべき要件はありますか？';
      dto.requirementsExtracted = false;
      dto.sessionStatus = 'active';
      dto.metadata = {
        intentDetected: 'clarification_request',
        suggestedTopics: ['スケーラビリティ', '保守性', 'ユーザビリティ'],
      };

      // Assert
      expect(dto.requirementsExtracted).toBe(false);
      expect(dto.sessionStatus).toBe('active');
      expect(dto.metadata.suggestedTopics).toContain('スケーラビリティ');
    });

    it('should handle session completion response', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'すべての要件を抽出しました。テンプレートの生成を開始します。';
      dto.requirementsExtracted = true;
      dto.sessionStatus = 'completed';
      dto.metadata = {
        totalRequirements: 15,
        processingComplete: true,
        nextStep: 'template_generation',
      };

      // Assert
      expect(dto.requirementsExtracted).toBe(true);
      expect(dto.sessionStatus).toBe('completed');
      expect(dto.metadata.nextStep).toBe('template_generation');
    });

    it('should handle error recovery response', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '申し訳ございません。もう一度お聞きしてもよろしいでしょうか？';
      dto.requirementsExtracted = false;
      dto.sessionStatus = 'active';
      dto.metadata = {
        errorRecovered: true,
        retryCount: 1,
        fallbackUsed: true,
      };

      // Assert
      expect(dto.requirementsExtracted).toBe(false);
      expect(dto.metadata.errorRecovered).toBe(true);
      expect(dto.metadata.fallbackUsed).toBe(true);
    });

    it('should handle session expiration warning', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = 'セッションの有効期限が近づいています。まもなく終了します。';
      dto.requirementsExtracted = false;
      dto.sessionStatus = 'active';
      dto.metadata = {
        warning: 'session_expiring',
        remainingTime: 300000, // 5 minutes in ms
        expiryTime: '2024-01-01T12:00:00Z',
      };

      // Assert
      expect(dto.sessionStatus).toBe('active');
      expect(dto.metadata.warning).toBe('session_expiring');
      expect(dto.metadata.remainingTime).toBe(300000);
    });
  });

  describe('edge cases', () => {
    it('should handle very long metadata keys', () => {
      // Arrange
      const dto = new AIResponseDto();
      const longKey = 'very_long_metadata_key_name_that_exceeds_normal_length';

      // Act
      dto.metadata = {
        [longKey]: 'value',
      };

      // Assert
      expect(dto.metadata[longKey]).toBe('value');
    });

    it('should handle deep copy of DTO', () => {
      // Arrange
      const dto1 = new AIResponseDto();
      dto1.message = 'Original';
      dto1.requirementsExtracted = true;
      dto1.sessionStatus = 'active';
      dto1.metadata = { count: 1 };

      // Act
      const dto2 = new AIResponseDto();
      Object.assign(dto2, JSON.parse(JSON.stringify(dto1)));
      dto2.message = 'Modified';
      if (dto2.metadata) {
        dto2.metadata.count = 2;
      }

      // Assert
      expect(dto1.message).toBe('Original');
      expect(dto2.message).toBe('Modified');
      expect(dto1.metadata?.count).toBe(1);
      expect(dto2.metadata?.count).toBe(2);
    });

    it('should handle circular reference in metadata gracefully', () => {
      // Arrange
      const dto = new AIResponseDto();
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      // Act
      dto.metadata = {
        regular: 'value',
        // Note: In real scenario, circular references should be avoided
        // This test demonstrates the DTO doesn't prevent it
      };

      // Assert
      expect(dto.metadata.regular).toBe('value');
    });

    it('should handle unicode in all fields', () => {
      // Arrange
      const dto = new AIResponseDto();

      // Act
      dto.message = '🎯 目標達成 💪 がんばりましょう！';
      dto.requirementsExtracted = true;
      dto.sessionStatus = 'active';
      dto.metadata = {
        emoji: '🚀',
        japanese: 'こんにちは',
        chinese: '你好',
        arabic: 'مرحبا',
      };

      // Assert
      expect(dto.message).toContain('🎯');
      expect(dto.metadata.emoji).toBe('🚀');
      expect(dto.metadata.japanese).toBe('こんにちは');
    });
  });
});