import { InterviewSession } from '../interview-session.entity';
import { SessionId } from '../../value-objects/session-id.vo';
import { SessionStatus } from '../../enums/session-status.enum';
import { ConversationMessage } from '../conversation-message.entity';
import { ProcessRequirement } from '../process-requirement.entity';
import { MessageRole } from '../../enums/message-role.enum';
import { RequirementCategory, RequirementPriority } from '../../enums/requirement-category.enum';

describe('InterviewSession Entity', () => {
  const validParams = {
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 1,
  };

  describe('constructor', () => {
    it('should create a valid interview session', () => {
      const session = new InterviewSession(validParams);

      expect(session).toBeDefined();
      expect(session.getSessionIdString()).toBe(validParams.sessionId);
      expect(session.getUserId()).toBe(validParams.userId);
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE);
      expect(session.getContext()).toEqual({});
      expect(session.getConversation()).toEqual([]);
      expect(session.getExtractedRequirements()).toEqual([]);
    });

    it('should accept SessionId value object', () => {
      const sessionId = new SessionId('550e8400-e29b-41d4-a716-446655440001');
      const session = new InterviewSession({
        ...validParams,
        sessionId,
      });

      expect(session.getSessionId()).toBe(sessionId);
    });

    it('should throw error for invalid user ID', () => {
      expect(() => new InterviewSession({
        ...validParams,
        userId: 0,
      })).toThrow('Valid user ID is required');

      expect(() => new InterviewSession({
        ...validParams,
        userId: -1,
      })).toThrow('Valid user ID is required');
    });

    it('should throw error if expiration is before creation', () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);

      expect(() => new InterviewSession({
        ...validParams,
        createdAt: new Date(),
        expiresAt: past,
      })).toThrow('Expiration date must be after or equal to creation date');
    });
  });

  describe('session state management', () => {
    let session: InterviewSession;

    beforeEach(() => {
      session = new InterviewSession(validParams);
    });

    it('should check if session is active', () => {
      expect(session.isActive()).toBe(true);
      expect(session.isCompleted()).toBe(false);
      expect(session.isExpired()).toBe(false);
    });

    it('should complete session', () => {
      session.complete();
      expect(session.getStatus()).toBe(SessionStatus.COMPLETED);
      expect(session.isCompleted()).toBe(true);
      expect(session.isActive()).toBe(false);
    });

    it('should pause session', () => {
      session.pause();
      expect(session.getStatus()).toBe(SessionStatus.PAUSED);
      expect(session.isActive()).toBe(false);
    });

    it('should resume paused session', () => {
      session.pause();
      session.resume();
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE);
      expect(session.isActive()).toBe(true);
    });

    it('should cancel session', () => {
      session.cancel();
      expect(session.getStatus()).toBe(SessionStatus.CANCELLED);
      expect(session.isActive()).toBe(false);
    });

    it('should expire session', () => {
      session.expire();
      expect(session.getStatus()).toBe(SessionStatus.EXPIRED);
      expect(session.isActive()).toBe(false);
    });

    it('should not allow resuming expired session', () => {
      const now = new Date();
      const expiredSession = new InterviewSession({
        ...validParams,
        status: SessionStatus.PAUSED,
        createdAt: new Date(now.getTime() - 10000),  // 10 seconds ago
        expiresAt: new Date(now.getTime() - 1000),   // 1 second ago (expired)
      });

      expect(() => expiredSession.resume()).toThrow('Cannot resume expired session');
    });

    it('should not allow canceling completed session', () => {
      session.complete();
      expect(() => session.cancel()).toThrow('Cannot cancel completed session');
    });
  });

  describe('context management', () => {
    let session: InterviewSession;

    beforeEach(() => {
      session = new InterviewSession(validParams);
    });

    it('should update context', () => {
      const context = {
        industry: 'Technology',
        processType: 'Software Development',
        complexity: 'medium' as const,
      };

      session.updateContext(context);
      expect(session.getContext()).toEqual(context);
    });

    it('should merge context updates', () => {
      session.updateContext({ industry: 'Technology' });
      session.updateContext({ processType: 'Development' });

      expect(session.getContext()).toEqual({
        industry: 'Technology',
        processType: 'Development',
      });
    });

    it('should not allow context update on inactive session', () => {
      session.complete();
      expect(() => session.updateContext({ industry: 'Test' }))
        .toThrow('Session cannot be modified in current state');
    });
  });

  describe('conversation management', () => {
    let session: InterviewSession;

    beforeEach(() => {
      session = new InterviewSession(validParams);
    });

    it('should add messages to conversation', () => {
      const message = ConversationMessage.createUserMessage(
        'msg-1',
        'Test message'
      );

      session.addMessage(message);
      expect(session.getConversation()).toHaveLength(1);
      expect(session.getMessageCount()).toBe(1);
      expect(session.getLastMessage()).toBe(message);
    });

    it('should not allow adding message to inactive session', () => {
      const message = ConversationMessage.createUserMessage(
        'msg-1',
        'Test message'
      );

      session.complete();
      expect(() => session.addMessage(message))
        .toThrow('Cannot add message to inactive session');
    });
  });

  describe('requirements management', () => {
    let session: InterviewSession;

    beforeEach(() => {
      session = new InterviewSession(validParams);
    });

    it('should add requirements', () => {
      const requirement = new ProcessRequirement({
        id: 'req-1',
        category: RequirementCategory.GOAL,
        description: 'Test requirement',
        priority: RequirementPriority.HIGH,
        confidence: 0.8,
        extractedFrom: 'msg-1',
      });

      session.addRequirement(requirement);
      expect(session.getExtractedRequirements()).toHaveLength(1);
      expect(session.getRequirementCount()).toBe(1);
    });

    it('should update requirements', () => {
      const requirements = [
        new ProcessRequirement({
          id: 'req-1',
          category: RequirementCategory.GOAL,
          description: 'Requirement 1',
          priority: RequirementPriority.HIGH,
          confidence: 0.8,
          extractedFrom: 'msg-1',
        }),
        new ProcessRequirement({
          id: 'req-2',
          category: RequirementCategory.CONSTRAINT,
          description: 'Requirement 2',
          priority: RequirementPriority.MEDIUM,
          confidence: 0.7,
          extractedFrom: 'msg-2',
        }),
      ];

      session.updateRequirements(requirements);
      expect(session.getExtractedRequirements()).toHaveLength(2);
      expect(session.getRequirementCount()).toBe(2);
    });
  });

  describe('template management', () => {
    let session: InterviewSession;

    beforeEach(() => {
      session = new InterviewSession(validParams);
    });

    it('should set generated template', () => {
      const template = {
        name: 'Test Template',
        steps: [
          {
            name: 'Step 1',
            description: 'First step',
            duration: 5,
            dependencies: [],
          },
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          confidence: 0.85,
          sources: ['source1'],
        },
      };

      session.setGeneratedTemplate(template);
      expect(session.getGeneratedTemplate()).toEqual(template);
    });
  });

  describe('expiration management', () => {
    it('should calculate default expiration', () => {
      const session = new InterviewSession(validParams);
      const now = new Date();
      const expires = session.getExpiresAt();

      const diffMinutes = (expires.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(59);
      expect(diffMinutes).toBeLessThan(61);
    });

    it('should extend expiration', () => {
      const session = new InterviewSession(validParams);
      const originalExpiration = session.getExpiresAt();

      session.extendExpiration(30);
      const newExpiration = session.getExpiresAt();

      const diffMinutes = (newExpiration.getTime() - originalExpiration.getTime()) / (1000 * 60);
      expect(diffMinutes).toBe(30);
    });

    it('should not extend expiration for inactive session', () => {
      const session = new InterviewSession(validParams);
      session.complete();

      expect(() => session.extendExpiration(30))
        .toThrow('Only active sessions can be extended');
    });
  });

  describe('utility methods', () => {
    it('should get session duration', () => {
      const createdAt = new Date();
      const updatedAt = new Date(createdAt.getTime() + 1000 * 60 * 30); // 30 minutes later

      const session = new InterviewSession({
        ...validParams,
        createdAt,
        updatedAt,
      });

      expect(session.getDuration()).toBe(1000 * 60 * 30);
    });

    it('should check if session can be modified', () => {
      const session = new InterviewSession(validParams);
      expect(session.canBeModified()).toBe(true);

      session.complete();
      expect(session.canBeModified()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const session = new InterviewSession(validParams);
      const json = session.toJSON();

      expect(json).toHaveProperty('sessionId');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('conversation');
      expect(json).toHaveProperty('extractedRequirements');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
      expect(json).toHaveProperty('expiresAt');
    });

    it('should create from JSON', () => {
      const original = new InterviewSession(validParams);
      const json = original.toJSON();
      const restored = InterviewSession.fromJSON(json);

      expect(restored.getSessionIdString()).toBe(original.getSessionIdString());
      expect(restored.getUserId()).toBe(original.getUserId());
      expect(restored.getStatus()).toBe(original.getStatus());
    });
  });
});