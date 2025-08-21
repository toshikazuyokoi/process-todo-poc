import { SessionId } from '../session-id.vo';

describe('SessionId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid session ID with UUID format', () => {
      const sessionId = new SessionId('550e8400-e29b-41d4-a716-446655440000');
      expect(sessionId.getValue()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should generate a new UUID when no value provided', () => {
      const sessionId = new SessionId();
      expect(sessionId.getValue()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should throw error for invalid UUID format', () => {
      expect(() => new SessionId('invalid-id')).toThrow('Invalid session ID format: invalid-id');
    });

    it('should throw error for non-UUID string', () => {
      expect(() => new SessionId('SESSION-123456-ABCDEF')).toThrow('Invalid session ID format: SESSION-123456-ABCDEF');
    });

    it('should accept valid UUID v4', () => {
      const sessionId = new SessionId('550e8400-e29b-41d4-a716-446655440000');
      expect(sessionId.getValue()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should accept valid UUID v1', () => {
      const sessionId = new SessionId('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(sessionId.getValue()).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    });

    it('should accept uppercase UUID', () => {
      const sessionId = new SessionId('550E8400-E29B-41D4-A716-446655440000');
      expect(sessionId.getValue()).toBe('550E8400-E29B-41D4-A716-446655440000');
    });

    it('should throw error for malformed UUID', () => {
      expect(() => new SessionId('550e8400-e29b-41d4-a716'))
        .toThrow('Invalid session ID format: 550e8400-e29b-41d4-a716');
    });

    it('should throw error for UUID with invalid characters', () => {
      expect(() => new SessionId('550e8400-e29b-41d4-a716-44665544000g'))
        .toThrow('Invalid session ID format: 550e8400-e29b-41d4-a716-44665544000g');
    });
  });

  describe('comparison methods', () => {
    describe('equals', () => {
      it('should return true for identical session IDs', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const id1 = new SessionId(uuid);
        const id2 = new SessionId(uuid);
        expect(id1.equals(id2)).toBe(true);
      });

      it('should return false for different session IDs', () => {
        const id1 = new SessionId('550e8400-e29b-41d4-a716-446655440000');
        const id2 = new SessionId('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
        expect(id1.equals(id2)).toBe(false);
      });

      it('should return false when comparing with null', () => {
        const id = new SessionId('550e8400-e29b-41d4-a716-446655440000');
        expect(id.equals(null as any)).toBe(false);
      });

      it('should return false when comparing with undefined', () => {
        const id = new SessionId('550e8400-e29b-41d4-a716-446655440000');
        expect(id.equals(undefined as any)).toBe(false);
      });
    });
  });

  describe('toString', () => {
    it('should return the session ID value', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const sessionId = new SessionId(uuid);
      expect(sessionId.toString()).toBe(uuid);
      expect(String(sessionId)).toBe(uuid);
    });
  });

  describe('static factory methods', () => {
    describe('create', () => {
      it('should generate a valid UUID v4', () => {
        const sessionId = SessionId.create();
        expect(sessionId.getValue()).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });

      it('should generate unique IDs', () => {
        const id1 = SessionId.create();
        const id2 = SessionId.create();
        const id3 = SessionId.create();
        
        expect(id1.equals(id2)).toBe(false);
        expect(id2.equals(id3)).toBe(false);
        expect(id1.equals(id3)).toBe(false);
      });
    });

    describe('from', () => {
      it('should create SessionId from valid UUID string', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const sessionId = SessionId.from(uuid);
        expect(sessionId.getValue()).toBe(uuid);
      });

      it('should throw error for invalid string', () => {
        expect(() => SessionId.from('invalid-uuid'))
          .toThrow('Invalid session ID format: invalid-uuid');
      });

      it('should be equivalent to constructor with value', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const id1 = new SessionId(uuid);
        const id2 = SessionId.from(uuid);
        expect(id1.equals(id2)).toBe(true);
      });
    });
  });

  describe('immutability', () => {
    it('should not allow modification of the value', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const sessionId = new SessionId(uuid);
      const value1 = sessionId.getValue();
      const value2 = sessionId.getValue();
      
      expect(value1).toBe(uuid);
      expect(value2).toBe(uuid);
      expect(value1).toBe(value2);
    });
  });
});