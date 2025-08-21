import { MessageContent } from '../message-content.vo';

describe('MessageContent Value Object', () => {
  describe('constructor', () => {
    it('should create a valid message content', () => {
      const content = new MessageContent('Hello, this is a test message');
      expect(content.getValue()).toBe('Hello, this is a test message');
    });

    it('should throw error when content is empty string', () => {
      expect(() => new MessageContent('')).toThrow('Message content must be a non-empty string');
    });

    it('should throw error when content is only whitespace', () => {
      expect(() => new MessageContent('   ')).toThrow('Message content must be at least 1 character');
    });

    it('should throw error when content is undefined', () => {
      expect(() => new MessageContent(undefined as any)).toThrow('Message content must be a non-empty string');
    });

    it('should throw error when content is null', () => {
      expect(() => new MessageContent(null as any)).toThrow('Message content must be a non-empty string');
    });

    it('should throw error when content exceeds maximum length', () => {
      const longContent = 'a'.repeat(10001);
      expect(() => new MessageContent(longContent))
        .toThrow('Message content must not exceed 10000 characters');
    });

    it('should accept content at maximum length', () => {
      const maxContent = 'a'.repeat(10000);
      const content = new MessageContent(maxContent);
      expect(content.getValue()).toHaveLength(10000);
    });

    it('should trim whitespace', () => {
      const content = new MessageContent('  Hello World  ');
      expect(content.getValue()).toBe('Hello World');
    });
  });

  describe('content properties', () => {
    describe('getLength', () => {
      it('should return correct length for normal text', () => {
        const content = new MessageContent('Hello, world!');
        expect(content.getLength()).toBe(13);
      });

      it('should return correct length for unicode characters', () => {
        const content = new MessageContent('こんにちは世界');
        expect(content.getLength()).toBe(7);
      });

      it('should return correct length for emojis', () => {
        const content = new MessageContent('Hello 😀 World 🌍');
        expect(content.getLength()).toBe(17);  // Emojis count as 2 characters in JavaScript
      });

      it('should return 1 for single character', () => {
        const content = new MessageContent('a');
        expect(content.getLength()).toBe(1);
      });
    });

    describe('getWordCount', () => {
      it('should count words correctly in English', () => {
        const content = new MessageContent('The quick brown fox jumps over the lazy dog');
        expect(content.getWordCount()).toBe(9);
      });

      it('should handle multiple spaces', () => {
        const content = new MessageContent('The   quick    brown    fox');
        expect(content.getWordCount()).toBe(4);
      });

      it('should handle tabs and newlines', () => {
        const content = new MessageContent('The\tquick\nbrown\r\nfox');
        expect(content.getWordCount()).toBe(4);
      });

      it('should return 0 for punctuation only', () => {
        const content = new MessageContent('...,,,!!!???');
        expect(content.getWordCount()).toBe(1);  // Punctuation is counted as one word
      });

      it('should count hyphenated words as one', () => {
        const content = new MessageContent('This is a well-formed sentence');
        expect(content.getWordCount()).toBe(5);
      });

      it('should handle contractions', () => {
        const content = new MessageContent("I'm can't won't shouldn't");
        expect(content.getWordCount()).toBe(4);
      });

      it('should return 1 for single word', () => {
        const content = new MessageContent('Hello');
        expect(content.getWordCount()).toBe(1);
      });
    });
  });

  describe('content validation', () => {
    describe('contains', () => {
      it('should find substring case-insensitively', () => {
        const content = new MessageContent('The Quick Brown Fox');
        expect(content.contains('quick')).toBe(true);
      });

      it('should return false for non-existent substring', () => {
        const content = new MessageContent('Hello world');
        expect(content.contains('goodbye')).toBe(false);
      });

      it('should find empty string', () => {
        const content = new MessageContent('Hello');
        expect(content.contains('')).toBe(true);
      });

      it('should handle special characters', () => {
        const content = new MessageContent('Hello (world) [test]');
        expect(content.contains('(world)')).toBe(true);
      });
    });
  });

  describe('text transformation', () => {
    describe('truncate', () => {
      it('should not truncate when content is shorter than max length', () => {
        const content = new MessageContent('Short text');
        expect(content.truncate(20)).toBe('Short text');
      });

      it('should truncate and add ellipsis when content is longer', () => {
        const content = new MessageContent('This is a very long text that needs truncation');
        expect(content.truncate(20)).toBe('This is a very lo...');
      });

      it('should use custom ellipsis', () => {
        const content = new MessageContent('This is a very long text');
        expect(content.truncate(10, '---')).toBe('This is---');
      });

      it('should handle exact length match', () => {
        const content = new MessageContent('Exact ten!');
        expect(content.truncate(10)).toBe('Exact ten!');
      });

      it('should handle very short max length', () => {
        const content = new MessageContent('Hello world');
        expect(content.truncate(5)).toBe('He...');
      });

      it('should handle truncation with single character ellipsis', () => {
        const content = new MessageContent('Hello world');
        expect(content.truncate(7, '.')).toBe('Hello .');
      });

      it('should handle truncation with no ellipsis', () => {
        const content = new MessageContent('Hello world');
        expect(content.truncate(5, '')).toBe('Hello');
      });
    });
  });

  describe('comparison methods', () => {
    describe('equals', () => {
      it('should return true for identical content', () => {
        const content1 = new MessageContent('Hello world');
        const content2 = new MessageContent('Hello world');
        expect(content1.equals(content2)).toBe(true);
      });

      it('should return false for different content', () => {
        const content1 = new MessageContent('Hello world');
        const content2 = new MessageContent('Hello World');
        expect(content1.equals(content2)).toBe(false);
      });

      it('should be case sensitive', () => {
        const content1 = new MessageContent('hello');
        const content2 = new MessageContent('HELLO');
        expect(content1.equals(content2)).toBe(false);
      });

      it('should handle special characters', () => {
        const content1 = new MessageContent('Hello 😀 World');
        const content2 = new MessageContent('Hello 😀 World');
        expect(content1.equals(content2)).toBe(true);
      });

      it('should return false when comparing with null', () => {
        const content = new MessageContent('Hello');
        expect(content.equals(null as any)).toBe(false);
      });

      it('should return false when comparing with undefined', () => {
        const content = new MessageContent('Hello');
        expect(content.equals(undefined as any)).toBe(false);
      });
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const content = new MessageContent('Test message');
      expect(content.toString()).toBe('Test message');
      expect(String(content)).toBe('Test message');
    });
  });

  describe('static factory method', () => {
    describe('from', () => {
      it('should create MessageContent from string', () => {
        const content = MessageContent.from('Hello world');
        expect(content.getValue()).toBe('Hello world');
      });

      it('should throw error for invalid input', () => {
        expect(() => MessageContent.from('')).toThrow('Message content must be a non-empty string');
      });

      it('should be equivalent to constructor', () => {
        const content1 = new MessageContent('Test');
        const content2 = MessageContent.from('Test');
        expect(content1.equals(content2)).toBe(true);
      });
    });
  });
});