import { ProcessRequirementsDto } from './process-requirements.dto';

describe('ProcessRequirementsDto', () => {
  describe('constructor and initialization', () => {
    it('should create DTO with all required fields', () => {
      // Arrange
      const data = {
        sessionId: 'test-session-123',
        requirements: [],
        metadata: {
          extractedAt: new Date('2024-01-01T00:00:00Z'),
          extractedBy: 'gpt-4',
        },
      };

      // Act
      const dto = new ProcessRequirementsDto();
      Object.assign(dto, data);

      // Assert
      expect(dto.sessionId).toBe(data.sessionId);
      expect(dto.requirements).toEqual(data.requirements);
      expect(dto.metadata).toEqual(data.metadata);
    });

    it('should handle empty requirements array', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [];

      // Assert
      expect(dto.requirements).toEqual([]);
      expect(dto.requirements.length).toBe(0);
    });

    it('should handle requirements with data', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();
      const requirements = [
        {
          category: '機能要件',
          description: 'ユーザー認証機能の実装',
          priority: 'high' as const,
        },
        {
          category: '非機能要件',
          description: 'レスポンス時間1秒以内',
          priority: 'medium' as const,
        },
      ];

      // Act
      dto.requirements = requirements;

      // Assert
      expect(dto.requirements).toEqual(requirements);
      expect(dto.requirements.length).toBe(2);
    });
  });

  describe('requirement priority variations', () => {
    it('should handle high priority requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        {
          category: 'セキュリティ',
          description: 'データ暗号化必須',
          priority: 'high',
        },
      ];

      // Assert
      expect(dto.requirements[0].priority).toBe('high');
    });

    it('should handle medium priority requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        {
          category: 'パフォーマンス',
          description: '処理速度の最適化',
          priority: 'medium',
        },
      ];

      // Assert
      expect(dto.requirements[0].priority).toBe('medium');
    });

    it('should handle low priority requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        {
          category: 'UI/UX',
          description: 'ダークモード対応',
          priority: 'low',
        },
      ];

      // Assert
      expect(dto.requirements[0].priority).toBe('low');
    });

    it('should handle mixed priority requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: 'Critical', description: 'Must have', priority: 'high' },
        { category: 'Important', description: 'Should have', priority: 'medium' },
        { category: 'Nice', description: 'Could have', priority: 'low' },
      ];

      // Assert
      expect(dto.requirements[0].priority).toBe('high');
      expect(dto.requirements[1].priority).toBe('medium');
      expect(dto.requirements[2].priority).toBe('low');
    });
  });

  describe('requirement category variations', () => {
    it('should handle Japanese categories', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: '機能要件', description: '基本機能', priority: 'high' },
        { category: '非機能要件', description: '性能要件', priority: 'medium' },
        { category: 'セキュリティ要件', description: '認証認可', priority: 'high' },
        { category: 'ユーザビリティ要件', description: '使いやすさ', priority: 'low' },
      ];

      // Assert
      expect(dto.requirements[0].category).toBe('機能要件');
      expect(dto.requirements[1].category).toBe('非機能要件');
      expect(dto.requirements[2].category).toBe('セキュリティ要件');
      expect(dto.requirements[3].category).toBe('ユーザビリティ要件');
    });

    it('should handle English categories', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: 'Functional', description: 'Core features', priority: 'high' },
        { category: 'Performance', description: 'Speed optimization', priority: 'medium' },
        { category: 'Security', description: 'Data protection', priority: 'high' },
        { category: 'Scalability', description: 'Growth support', priority: 'medium' },
      ];

      // Assert
      expect(dto.requirements.map(r => r.category)).toEqual([
        'Functional',
        'Performance',
        'Security',
        'Scalability',
      ]);
    });

    it('should handle mixed language categories', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: 'API要件', description: 'REST API', priority: 'high' },
        { category: 'Database設計', description: 'Schema design', priority: 'medium' },
        { category: 'CI/CDパイプライン', description: 'Automation', priority: 'low' },
      ];

      // Assert
      expect(dto.requirements[0].category).toContain('API');
      expect(dto.requirements[1].category).toContain('Database');
      expect(dto.requirements[2].category).toContain('CI/CD');
    });
  });

  describe('requirement description variations', () => {
    it('should handle short descriptions', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: 'Feature', description: 'Login', priority: 'high' },
      ];

      // Assert
      expect(dto.requirements[0].description).toBe('Login');
      expect(dto.requirements[0].description.length).toBeLessThan(10);
    });

    it('should handle long descriptions', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();
      const longDescription = 'ユーザーが安全にシステムにアクセスできるよう、' +
        '多要素認証（MFA）を含む包括的な認証システムを実装する必要があります。' +
        'これには、パスワードポリシーの設定、セッション管理、' +
        'ログイン試行の制限などが含まれます。';

      // Act
      dto.requirements = [
        { category: 'Security', description: longDescription, priority: 'high' },
      ];

      // Assert
      expect(dto.requirements[0].description).toBe(longDescription);
      expect(dto.requirements[0].description.length).toBeGreaterThan(100);
    });

    it('should handle descriptions with special characters', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        {
          category: 'Technical',
          description: 'Support URL: https://example.com/api?param=value&type=json#section',
          priority: 'medium',
        },
        {
          category: 'Format',
          description: 'Allow special chars: @#$%^&*()_+-=[]{}|;:",.<>?/',
          priority: 'low',
        },
      ];

      // Assert
      expect(dto.requirements[0].description).toContain('https://');
      expect(dto.requirements[1].description).toContain('@#$%^&*()');
    });

    it('should handle descriptions with newlines', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        {
          category: 'Documentation',
          description: 'Requirements:\n- Item 1\n- Item 2\n- Item 3',
          priority: 'medium',
        },
      ];

      // Assert
      expect(dto.requirements[0].description.split('\n').length).toBe(4);
    });
  });

  describe('metadata handling', () => {
    it('should handle metadata with dates', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.metadata = {
        extractedAt: new Date('2024-01-01T12:00:00Z'),
        lastUpdated: new Date('2024-01-02T12:00:00Z'),
      };

      // Assert
      expect(dto.metadata.extractedAt).toBeInstanceOf(Date);
      expect(dto.metadata.lastUpdated).toBeInstanceOf(Date);
      expect(dto.metadata.lastUpdated > dto.metadata.extractedAt).toBe(true);
    });

    it('should handle metadata with model information', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.metadata = {
        extractedBy: 'gpt-4',
        modelVersion: '0613',
        confidence: 0.95,
      };

      // Assert
      expect(dto.metadata.extractedBy).toBe('gpt-4');
      expect(dto.metadata.modelVersion).toBe('0613');
      expect(dto.metadata.confidence).toBe(0.95);
    });

    it('should handle metadata with statistics', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.metadata = {
        totalRequirements: 15,
        highPriority: 5,
        mediumPriority: 7,
        lowPriority: 3,
        categories: ['機能', '非機能', 'セキュリティ'],
      };

      // Assert
      expect(dto.metadata.totalRequirements).toBe(15);
      expect(dto.metadata.highPriority + dto.metadata.mediumPriority + dto.metadata.lowPriority)
        .toBe(dto.metadata.totalRequirements);
      expect(dto.metadata.categories).toHaveLength(3);
    });

    it('should handle empty metadata', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.metadata = {};

      // Assert
      expect(dto.metadata).toEqual({});
      expect(Object.keys(dto.metadata).length).toBe(0);
    });

    it('should handle nested metadata', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.metadata = {
        extraction: {
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:01:00Z',
          duration: 60000,
        },
        validation: {
          passed: true,
          warnings: [],
          errors: [],
        },
      };

      // Assert
      expect(dto.metadata.extraction.duration).toBe(60000);
      expect(dto.metadata.validation.passed).toBe(true);
    });
  });

  describe('sessionId variations', () => {
    it('should handle UUID format sessionId', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.sessionId = '550e8400-e29b-41d4-a716-446655440000';

      // Assert
      expect(dto.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should handle custom format sessionId', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.sessionId = 'REQ_2024_01_01_USER123';

      // Assert
      expect(dto.sessionId).toContain('REQ');
      expect(dto.sessionId).toContain('USER123');
    });
  });

  describe('large dataset handling', () => {
    it('should handle many requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();
      const manyRequirements = Array.from({ length: 100 }, (_, i) => ({
        category: `Category${Math.floor(i / 10)}`,
        description: `Requirement ${i}`,
        priority: ['high', 'medium', 'low'][i % 3] as 'high' | 'medium' | 'low',
      }));

      // Act
      dto.requirements = manyRequirements;

      // Assert
      expect(dto.requirements.length).toBe(100);
      expect(dto.requirements[0].description).toBe('Requirement 0');
      expect(dto.requirements[99].description).toBe('Requirement 99');
    });

    it('should handle requirements grouping by category', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();
      dto.requirements = [
        { category: 'Security', description: 'Req1', priority: 'high' },
        { category: 'Security', description: 'Req2', priority: 'high' },
        { category: 'Performance', description: 'Req3', priority: 'medium' },
        { category: 'Performance', description: 'Req4', priority: 'low' },
      ];

      // Act
      const grouped = dto.requirements.reduce((acc, req) => {
        if (!acc[req.category]) acc[req.category] = [];
        acc[req.category].push(req);
        return acc;
      }, {} as Record<string, typeof dto.requirements>);

      // Assert
      expect(grouped['Security']).toHaveLength(2);
      expect(grouped['Performance']).toHaveLength(2);
    });

    it('should handle requirements filtering by priority', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();
      dto.requirements = [
        { category: 'A', description: 'High1', priority: 'high' },
        { category: 'B', description: 'Low1', priority: 'low' },
        { category: 'C', description: 'High2', priority: 'high' },
        { category: 'D', description: 'Medium1', priority: 'medium' },
      ];

      // Act
      const highPriority = dto.requirements.filter(r => r.priority === 'high');
      const notLow = dto.requirements.filter(r => r.priority !== 'low');

      // Assert
      expect(highPriority).toHaveLength(2);
      expect(notLow).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle requirements with identical descriptions', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: 'Feature', description: 'Same requirement', priority: 'high' },
        { category: 'Feature', description: 'Same requirement', priority: 'medium' },
      ];

      // Assert
      expect(dto.requirements[0].description).toBe(dto.requirements[1].description);
      expect(dto.requirements[0].priority).not.toBe(dto.requirements[1].priority);
    });

    it('should handle deep copy of requirements', () => {
      // Arrange
      const dto1 = new ProcessRequirementsDto();
      const dto2 = new ProcessRequirementsDto();
      const originalReqs = [
        { category: 'Test', description: 'Original', priority: 'high' as const },
      ];

      // Act
      dto1.requirements = originalReqs;
      dto2.requirements = JSON.parse(JSON.stringify(originalReqs));
      dto2.requirements[0].description = 'Modified';

      // Assert
      expect(dto1.requirements[0].description).toBe('Original');
      expect(dto2.requirements[0].description).toBe('Modified');
    });

    it('should handle requirements with unicode', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.requirements = [
        { category: '🏗️ Infrastructure', description: '📦 Containerization', priority: 'high' },
        { category: '🔒 Security', description: '🔐 Encryption', priority: 'high' },
        { category: '📊 Analytics', description: '📈 Metrics', priority: 'medium' },
      ];

      // Assert
      expect(dto.requirements[0].category).toContain('🏗️');
      expect(dto.requirements[1].description).toContain('🔐');
    });

    it('should handle metadata with various types', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.metadata = {
        boolean: true,
        number: 42,
        string: 'text',
        array: [1, 2, 3],
        object: { nested: 'value' },
        null: null,
        undefined: undefined,
      };

      // Assert
      expect(typeof dto.metadata.boolean).toBe('boolean');
      expect(typeof dto.metadata.number).toBe('number');
      expect(typeof dto.metadata.string).toBe('string');
      expect(Array.isArray(dto.metadata.array)).toBe(true);
      expect(typeof dto.metadata.object).toBe('object');
      expect(dto.metadata.null).toBeNull();
      expect(dto.metadata.undefined).toBeUndefined();
    });
  });

  describe('complete requirement scenarios', () => {
    it('should handle comprehensive software requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.sessionId = 'software-req-session';
      dto.requirements = [
        { category: '機能要件', description: 'ユーザー認証・認可システム', priority: 'high' },
        { category: '機能要件', description: 'データ管理CRUD操作', priority: 'high' },
        { category: '非機能要件', description: '99.9%アップタイム', priority: 'high' },
        { category: '非機能要件', description: 'レスポンス時間200ms以内', priority: 'medium' },
        { category: 'セキュリティ', description: 'SSL/TLS暗号化', priority: 'high' },
        { category: 'セキュリティ', description: 'OWASP Top 10対策', priority: 'high' },
        { category: 'ユーザビリティ', description: 'モバイル対応', priority: 'medium' },
        { category: 'ユーザビリティ', description: 'アクセシビリティ対応', priority: 'low' },
      ];
      dto.metadata = {
        project: 'Enterprise Web Application',
        extractedAt: new Date(),
        totalRequirements: 8,
        criticalCount: 5,
      };

      // Assert
      expect(dto.requirements).toHaveLength(8);
      expect(dto.requirements.filter(r => r.priority === 'high')).toHaveLength(5);
      expect(dto.metadata.criticalCount).toBe(5);
    });

    it('should handle process improvement requirements', () => {
      // Arrange
      const dto = new ProcessRequirementsDto();

      // Act
      dto.sessionId = 'process-improvement-session';
      dto.requirements = [
        { category: 'プロセス改善', description: 'CI/CDパイプライン構築', priority: 'high' },
        { category: 'プロセス改善', description: 'コードレビュー自動化', priority: 'medium' },
        { category: '品質向上', description: 'テストカバレッジ80%以上', priority: 'high' },
        { category: '品質向上', description: '静的解析ツール導入', priority: 'medium' },
        { category: '効率化', description: 'デプロイ時間50%削減', priority: 'high' },
        { category: '効率化', description: 'ドキュメント自動生成', priority: 'low' },
      ];
      dto.metadata = {
        improvementAreas: ['automation', 'quality', 'efficiency'],
        estimatedImpact: 'high',
        implementationPhase: 'planning',
      };

      // Assert
      const categories = [...new Set(dto.requirements.map(r => r.category))];
      expect(categories).toHaveLength(3);
      expect(dto.metadata.improvementAreas).toHaveLength(3);
    });
  });
});