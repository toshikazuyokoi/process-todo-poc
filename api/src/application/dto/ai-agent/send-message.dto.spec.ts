import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SendMessageDto } from './send-message.dto';

describe('SendMessageDto', () => {
  let dto: SendMessageDto;

  beforeEach(() => {
    dto = new SendMessageDto();
  });

  describe('正常系バリデーション', () => {
    it('should pass validation with valid message', async () => {
      // Arrange
      const plainDto = {
        message: 'We need to implement user authentication for the application',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept minimum length message', async () => {
      // Arrange
      const plainDto = {
        message: 'A',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept maximum length message', async () => {
      // Arrange
      const plainDto = {
        message: 'a'.repeat(2000),
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept message with optional metadata', async () => {
      // Arrange
      const plainDto = {
        message: 'This is a test message',
        metadata: {
          intent: 'requirement',
          priority: 'high',
          category: 'security',
        },
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.metadata).toEqual({
        intent: 'requirement',
        priority: 'high',
        category: 'security',
      });
    });

    it('should accept Japanese message', async () => {
      // Arrange
      const plainDto = {
        message: '認証機能を実装する必要があります。二要素認証も含めてください。',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept mixed language message', async () => {
      // Arrange
      const plainDto = {
        message: 'We need OAuth2.0認証 with JWT tokens for API security',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept message with special characters', async () => {
      // Arrange
      const plainDto = {
        message: 'Requirements: @user_auth, #security, API rate limit: 100/min',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept message with newlines', async () => {
      // Arrange
      const plainDto = {
        message: 'Requirements:\n1. User authentication\n2. Authorization\n3. Audit logging',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.message).toContain('\n');
    });

    it('should trim whitespace and pass validation', async () => {
      // Arrange
      const plainDto = {
        message: '  This message has whitespace  ',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.message).toBe('This message has whitespace');
    });
  });

  describe('異常系バリデーション - 必須フィールド', () => {
    it('should fail when message is missing', async () => {
      // Arrange
      const plainDto = {};
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when message is undefined', async () => {
      // Arrange
      const plainDto = {
        message: undefined,
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when message is null', async () => {
      // Arrange
      const plainDto: any = {
        message: null,
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('異常系バリデーション - 空文字列', () => {
    it('should fail when message is empty string', async () => {
      // Arrange
      const plainDto = {
        message: '',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when message contains only spaces', async () => {
      // Arrange
      const plainDto = {
        message: '   ',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when message contains only whitespace characters', async () => {
      // Arrange
      const plainDto = {
        message: '\t\n\r ',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('異常系バリデーション - 文字数制限', () => {
    it('should fail when message exceeds 2000 characters', async () => {
      // Arrange
      const plainDto = {
        message: 'a'.repeat(2001),
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail when message significantly exceeds limit', async () => {
      // Arrange
      const plainDto = {
        message: 'x'.repeat(5000),
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should handle multi-byte characters in length validation', async () => {
      // Arrange - 2000 Japanese characters (multi-byte)
      const plainDto = {
        message: 'あ'.repeat(2000),
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail when multi-byte message exceeds limit', async () => {
      // Arrange
      const plainDto = {
        message: 'あ'.repeat(2001),
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('異常系バリデーション - 型の不正', () => {
    it('should fail when message is not a string', async () => {
      // Arrange
      const plainDto: any = {
        message: 12345,
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const messageError = errors.find(e => e.property === 'message');
      expect(messageError).toBeDefined();
    });

    it('should fail when message is an object', async () => {
      // Arrange
      const plainDto: any = {
        message: { text: 'message' },
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const messageError = errors.find(e => e.property === 'message');
      expect(messageError).toBeDefined();
    });

    it('should fail when message is an array', async () => {
      // Arrange
      const plainDto: any = {
        message: ['message1', 'message2'],
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const messageError = errors.find(e => e.property === 'message');
      expect(messageError).toBeDefined();
    });

    it('should fail when message is boolean', async () => {
      // Arrange
      const plainDto: any = {
        message: true,
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const messageError = errors.find(e => e.property === 'message');
      expect(messageError).toBeDefined();
    });
  });

  describe('metadata フィールドのバリデーション', () => {
    it('should pass when metadata is undefined', async () => {
      // Arrange
      const plainDto = {
        message: 'Valid message',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.metadata).toBeUndefined();
    });

    it('should pass with empty metadata object', async () => {
      // Arrange
      const plainDto = {
        message: 'Valid message',
        metadata: {},
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.metadata).toEqual({});
    });

    it('should pass with complex metadata structure', async () => {
      // Arrange
      const plainDto = {
        message: 'Valid message',
        metadata: {
          intent: 'requirement',
          priority: 'high',
          categories: ['security', 'performance'],
          context: {
            userId: 123,
            sessionId: 'abc-def',
            timestamp: '2024-01-01T00:00:00Z',
          },
          flags: {
            urgent: true,
            reviewed: false,
          },
        },
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.metadata?.categories).toHaveLength(2);
      expect(dto.metadata?.context?.userId).toBe(123);
      expect(dto.metadata?.flags?.urgent).toBe(true);
    });

    it('should fail when metadata is not an object', async () => {
      // Arrange
      const plainDto: any = {
        message: 'Valid message',
        metadata: 'not an object',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const metadataError = errors.find(e => e.property === 'metadata');
      expect(metadataError).toBeDefined();
      expect(metadataError?.constraints).toHaveProperty('isObject');
    });

    it('should fail when metadata is an array', async () => {
      // Arrange
      const plainDto: any = {
        message: 'Valid message',
        metadata: ['item1', 'item2'],
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const metadataError = errors.find(e => e.property === 'metadata');
      expect(metadataError).toBeDefined();
    });

    it('should handle metadata with null values', async () => {
      // Arrange
      const plainDto = {
        message: 'Valid message',
        metadata: {
          key1: null,
          key2: 'value',
          key3: null,
        },
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.metadata?.key1).toBeNull();
      expect(dto.metadata?.key2).toBe('value');
    });
  });

  describe('エッジケース', () => {
    it('should handle boundary value exactly at 2000 characters', async () => {
      // Arrange
      const plainDto = {
        message: 'x'.repeat(2000),
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle message with emoji', async () => {
      // Arrange
      const plainDto = {
        message: 'Requirements: 🔐 Security, 🚀 Performance, 📊 Analytics',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.message).toContain('🔐');
      expect(dto.message).toContain('🚀');
      expect(dto.message).toContain('📊');
    });

    it('should handle message with various unicode characters', async () => {
      // Arrange
      const plainDto = {
        message: '测试 テスト тест اختبار δοκιμή',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle metadata with deep nesting', async () => {
      // Arrange
      const plainDto = {
        message: 'Valid message',
        metadata: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'deep value',
                },
              },
            },
          },
        },
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.metadata?.level1?.level2?.level3?.level4?.level5).toBe('deep value');
    });

    it('should handle message with HTML entities', async () => {
      // Arrange
      const plainDto = {
        message: 'Requirements: &lt;security&gt; &amp; &quot;performance&quot;',
      };
      dto = plainToInstance(SendMessageDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.message).toContain('&lt;');
      expect(dto.message).toContain('&amp;');
      expect(dto.message).toContain('&quot;');
    });
  });
});