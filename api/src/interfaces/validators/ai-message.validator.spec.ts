import { AIMessageValidator, SessionContext } from './ai-message.validator';
import { SendMessageDto } from '../../application/dto/ai-agent/send-message.dto';
import { VALIDATION_CONSTANTS } from './validation.constants';

describe('AIMessageValidator', () => {
  let validator: AIMessageValidator;

  beforeEach(() => {
    validator = new AIMessageValidator();
  });

  describe('validate', () => {
    const validDto: SendMessageDto = {
      message: 'We need to ensure all code is reviewed',
      metadata: { intent: 'requirement' },
    };

    it('should return valid result when no session context provided', async () => {
      const result = await validator.validate(validDto);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid result for active session', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'active',
        requirementsCount: 10,
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return error for expired session', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'expired',
        requirementsCount: 10,
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session has expired');
    });

    it('should return error for completed session', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'completed',
        requirementsCount: 10,
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session has already been completed');
    });

    it('should return error when requirements count exceeds limit', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'active',
        requirementsCount: VALIDATION_CONSTANTS.MAX_REQUIREMENTS_PER_SESSION + 1,
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Requirements count exceeds maximum limit of ${VALIDATION_CONSTANTS.MAX_REQUIREMENTS_PER_SESSION}`,
      );
    });

    it('should return valid result when requirements count is at limit', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'active',
        requirementsCount: VALIDATION_CONSTANTS.MAX_REQUIREMENTS_PER_SESSION,
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return multiple errors when multiple validations fail', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'expired',
        requirementsCount: VALIDATION_CONSTANTS.MAX_REQUIREMENTS_PER_SESSION + 1,
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Session has expired');
      expect(result.errors).toContain(
        `Requirements count exceeds maximum limit of ${VALIDATION_CONSTANTS.MAX_REQUIREMENTS_PER_SESSION}`,
      );
    });

    it('should handle session without requirements count', async () => {
      const session: SessionContext = {
        sessionId: 'session-123',
        status: 'active',
        // requirementsCount is undefined
      };

      const result = await validator.validate(validDto, session);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });
});