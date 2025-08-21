import { ConversationMessage } from '../conversation-message.entity';
import { MessageRole } from '../../enums/message-role.enum';
import { MessageContent } from '../../value-objects/message-content.vo';
import { ConfidenceScore } from '../../value-objects/confidence-score.vo';

describe('ConversationMessage Entity', () => {
  const validParams = {
    id: 'msg-123',
    role: MessageRole.USER,
    content: new MessageContent('Hello, I need help with a process'),
    metadata: {
      intent: 'greeting',
      confidence: new ConfidenceScore(0.95),
      tokenCount: 10
    }
  };

  describe('constructor', () => {
    it('should create a valid conversation message', () => {
      const message = new ConversationMessage(validParams);

      expect(message.getId()).toBe('msg-123');
      expect(message.getRole()).toBe(MessageRole.USER);
      expect(message.getContent()).toBeInstanceOf(MessageContent);
      expect(message.getMetadata()).toEqual(validParams.metadata);
      expect(message.getTimestamp()).toBeInstanceOf(Date);
    });

    it('should use current date when timestamp is not provided', () => {
      const before = new Date();
      const message = new ConversationMessage(validParams);
      const after = new Date();

      expect(message.getTimestamp().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message.getTimestamp().getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided timestamp', () => {
      const customTimestamp = new Date('2024-01-01T10:00:00Z');
      const message = new ConversationMessage({
        ...validParams,
        timestamp: customTimestamp
      });

      expect(message.getTimestamp()).toEqual(customTimestamp);
    });

    it('should accept string content and convert to MessageContent', () => {
      const message = new ConversationMessage({
        ...validParams,
        content: 'Simple string content'
      });

      expect(message.getContent()).toBeInstanceOf(MessageContent);
      expect(message.getContent().getValue()).toBe('Simple string content');
    });

    it('should throw error when id is empty', () => {
      expect(() => new ConversationMessage({
        ...validParams,
        id: ''
      })).toThrow('Message ID is required');
    });

    it('should throw error when id is missing', () => {
      expect(() => new ConversationMessage({
        ...validParams,
        id: undefined as any
      })).toThrow('Message ID is required');
    });

    it('should throw error when role is missing', () => {
      expect(() => new ConversationMessage({
        ...validParams,
        role: undefined as any
      })).toThrow('Message role is required');
    });

    it('should throw error when content is missing', () => {
      expect(() => new ConversationMessage({
        ...validParams,
        content: undefined as any
      })).toThrow('Message content must be a non-empty string');
    });
  });

  describe('role validation', () => {
    it('should accept USER role', () => {
      const message = new ConversationMessage({
        ...validParams,
        role: MessageRole.USER
      });
      expect(message.getRole()).toBe(MessageRole.USER);
    });

    it('should accept ASSISTANT role', () => {
      const message = new ConversationMessage({
        ...validParams,
        role: MessageRole.ASSISTANT
      });
      expect(message.getRole()).toBe(MessageRole.ASSISTANT);
    });

    it('should accept SYSTEM role', () => {
      const message = new ConversationMessage({
        ...validParams,
        role: MessageRole.SYSTEM
      });
      expect(message.getRole()).toBe(MessageRole.SYSTEM);
    });
  });

  describe('metadata handling', () => {
    it('should handle undefined metadata', () => {
      const message = new ConversationMessage({
        id: 'msg-123',
        role: MessageRole.USER,
        content: 'Test content'
      });

      expect(message.getMetadata()).toBeUndefined();
    });

    it('should store complex metadata', () => {
      const complexMetadata = {
        intent: 'process_inquiry',
        entities: {
          process_type: 'software_development',
          timeline: '3 months'
        },
        confidence: new ConfidenceScore(0.85),
        tokenCount: 150,
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      const message = new ConversationMessage({
        ...validParams,
        metadata: complexMetadata
      });

      expect(message.getMetadata()).toEqual(complexMetadata);
    });

    it('should return metadata reference', () => {
      const message = new ConversationMessage(validParams);
      const metadata1 = message.getMetadata();
      const metadata2 = message.getMetadata();

      expect(metadata1).toBe(metadata2);
    });
  });

  describe('utility methods', () => {
    describe('isUserMessage', () => {
      it('should return true for USER role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.USER
        });
        expect(message.isUserMessage()).toBe(true);
      });

      it('should return false for ASSISTANT role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.ASSISTANT
        });
        expect(message.isUserMessage()).toBe(false);
      });

      it('should return false for SYSTEM role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.SYSTEM
        });
        expect(message.isUserMessage()).toBe(false);
      });
    });

    describe('isAssistantMessage', () => {
      it('should return true for ASSISTANT role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.ASSISTANT
        });
        expect(message.isAssistantMessage()).toBe(true);
      });

      it('should return false for USER role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.USER
        });
        expect(message.isAssistantMessage()).toBe(false);
      });

      it('should return false for SYSTEM role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.SYSTEM
        });
        expect(message.isAssistantMessage()).toBe(false);
      });
    });

    describe('isSystemMessage', () => {
      it('should return true for SYSTEM role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.SYSTEM
        });
        expect(message.isSystemMessage()).toBe(true);
      });

      it('should return false for USER role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.USER
        });
        expect(message.isSystemMessage()).toBe(false);
      });

      it('should return false for ASSISTANT role', () => {
        const message = new ConversationMessage({
          ...validParams,
          role: MessageRole.ASSISTANT
        });
        expect(message.isSystemMessage()).toBe(false);
      });
    });

    describe('getContentText', () => {
      it('should return the text content', () => {
        const message = new ConversationMessage(validParams);
        expect(message.getContentText()).toBe('Hello, I need help with a process');
      });
    });

    describe('getTokenCount', () => {
      it('should return token count from metadata', () => {
        const message = new ConversationMessage(validParams);
        expect(message.getTokenCount()).toBe(10);
      });

      it('should return 0 when metadata is missing', () => {
        const message = new ConversationMessage({
          id: 'msg-123',
          role: MessageRole.USER,
          content: 'Test'
        });
        expect(message.getTokenCount()).toBe(0);
      });

      it('should return 0 when tokenCount is not in metadata', () => {
        const message = new ConversationMessage({
          ...validParams,
          metadata: { intent: 'test' }
        });
        expect(message.getTokenCount()).toBe(0);
      });
    });
  });

  describe('serialization', () => {
    describe('toJSON', () => {
      it('should serialize to plain object', () => {
        const timestamp = new Date('2024-01-01T10:00:00Z');
        const message = new ConversationMessage({
          ...validParams,
          timestamp
        });

        const json = message.toJSON();

        expect(json).toEqual({
          id: 'msg-123',
          role: MessageRole.USER,
          content: 'Hello, I need help with a process',
          metadata: {
            intent: 'greeting',
            confidence: 0.95,
            tokenCount: 10
          },
          timestamp: '2024-01-01T10:00:00.000Z'
        });
      });

      it('should handle undefined metadata', () => {
        const message = new ConversationMessage({
          id: 'msg-123',
          role: MessageRole.USER,
          content: 'Test'
        });

        const json = message.toJSON();

        expect(json.metadata).toBeUndefined();
      });
    });

    describe('fromJSON', () => {
      it('should deserialize from plain object', () => {
        const json = {
          id: 'msg-456',
          role: MessageRole.ASSISTANT,
          content: 'I can help you with that',
          metadata: { 
            confidence: 0.9,
            tokenCount: 15
          },
          timestamp: '2024-01-01T10:00:00.000Z'
        };

        const message = ConversationMessage.fromJSON(json);

        expect(message.getId()).toBe('msg-456');
        expect(message.getRole()).toBe(MessageRole.ASSISTANT);
        expect(message.getContentText()).toBe('I can help you with that');
        expect(message.getMetadata()?.confidence).toBeInstanceOf(ConfidenceScore);
        expect((message.getMetadata()?.confidence as ConfidenceScore)?.getValue()).toBe(0.9);
        expect(message.getMetadata()?.tokenCount).toBe(15);
        expect(message.getTimestamp()).toEqual(new Date('2024-01-01T10:00:00.000Z'));
      });

      it('should handle missing optional fields', () => {
        const json = {
          id: 'msg-789',
          role: MessageRole.SYSTEM,
          content: 'System message'
        };

        const message = ConversationMessage.fromJSON(json);

        expect(message.getId()).toBe('msg-789');
        expect(message.getRole()).toBe(MessageRole.SYSTEM);
        expect(message.getContentText()).toBe('System message');
        expect(message.getMetadata()).toBeUndefined();
      });

      it('should roundtrip correctly', () => {
        const original = new ConversationMessage(validParams);
        const json = original.toJSON();
        const restored = ConversationMessage.fromJSON(json);
        const restoredJson = restored.toJSON();

        expect(restoredJson).toEqual(json);
      });
    });
  });
});