import { InterviewSession, SessionStatus } from '../../src/domain/ai-agent/entities/interview-session.entity';
import { SessionId } from '../../src/domain/ai-agent/value-objects/session-id.vo';
import { ConversationMessage } from '../../src/domain/ai-agent/entities/conversation-message.entity';
import { ConversationMessageDto, AIResponse, ProcessRequirement } from '../../src/domain/ai-agent/types';
import { v4 as uuidv4 } from 'uuid';

export class TestDataFactory {
  static createMockSession(overrides?: Partial<any>): InterviewSession {
    const sessionId = overrides?.sessionId || uuidv4();
    const userId = overrides?.userId || 1;
    const now = new Date();
    const expiresAt = overrides?.expiresAt || new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return new InterviewSession({
      sessionId,
      userId,
      status: overrides?.status || SessionStatus.ACTIVE,
      context: overrides?.context || {
        industry: 'software_development',
        processType: 'project_management',
        goal: 'Create efficient development process',
      },
      conversation: overrides?.conversation || [],
      extractedRequirements: overrides?.extractedRequirements || [],
      createdAt: overrides?.createdAt || now,
      updatedAt: overrides?.updatedAt || now,
      expiresAt,
    });
  }

  static createMockConversationMessage(
    role: 'user' | 'assistant' | 'system' = 'user',
    content?: string,
  ): ConversationMessageDto {
    return {
      role,
      content: content || `Test ${role} message`,
      timestamp: new Date(),
      metadata: {},
    };
  }

  static createMockConversationMessageEntity(
    role: 'user' | 'assistant' | 'system' = 'user',
    content?: string,
  ): ConversationMessage {
    const messageContent = content || `Test ${role} message`;
    const messageId = uuidv4();
    
    switch (role) {
      case 'user':
        return ConversationMessage.createUserMessage(messageId, messageContent, { intent: 'test' });
      case 'assistant':
        return ConversationMessage.createAssistantMessage(messageId, messageContent, {});
      case 'system':
        return ConversationMessage.createSystemMessage(messageId, messageContent);
      default:
        return ConversationMessage.createUserMessage(messageId, messageContent, { intent: 'test' });
    }
  }

  static createMockAIResponse(overrides?: Partial<AIResponse>): AIResponse {
    return {
      content: overrides?.content || 'This is an AI response',
      suggestedQuestions: overrides?.suggestedQuestions || [
        'What is your team size?',
        'What is your timeline?',
        'What are your main challenges?',
      ],
      confidence: overrides?.confidence || 0.85,
      tokenCount: overrides?.tokenCount || 150,
      estimatedCost: overrides?.estimatedCost || 0.003,
      error: overrides?.error || false,
    };
  }

  static createMockProcessRequirement(overrides?: Partial<ProcessRequirement>): ProcessRequirement {
    return {
      id: overrides?.id || uuidv4(),
      category: overrides?.category || 'functional',
      description: overrides?.description || 'Test requirement',
      priority: overrides?.priority || 'medium',
      confidence: overrides?.confidence || 0.8,
      source: overrides?.source || 'user message',
      extractedAt: overrides?.extractedAt || new Date(),
    };
  }

  static createMockStartSessionInput(overrides?: Partial<any>) {
    return {
      userId: overrides?.userId !== undefined ? overrides.userId : 1,
      industry: overrides?.industry !== undefined ? overrides.industry : 'software_development',
      processType: overrides?.processType !== undefined ? overrides.processType : 'project_management',
      goal: overrides?.goal !== undefined ? overrides.goal : 'Create efficient development process',
      additionalContext: overrides?.additionalContext !== undefined ? overrides.additionalContext : {},
    };
  }

  static createMockProcessMessageInput(overrides?: Partial<any>) {
    return {
      sessionId: overrides?.sessionId || uuidv4(),
      userId: overrides?.userId || 1,
      message: overrides?.message !== undefined ? overrides.message : 'Test user message',
      metadata: overrides?.metadata || {},
    };
  }

  static createMockConversationSession(sessionId?: string) {
    return {
      sessionId: sessionId || uuidv4(),
      context: {
        industry: 'software_development',
        processType: 'project_management',
        goal: 'Create efficient development process',
      },
      conversationHistory: [],
    };
  }

  static createExpiredSession(userId?: number): InterviewSession {
    const now = new Date();
    const pastTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago

    // Create an expired session with EXPIRED status
    // This represents a session that has already been marked as expired
    return new InterviewSession({
      sessionId: uuidv4(),
      userId: userId || 1,
      status: SessionStatus.EXPIRED,  // Already marked as expired
      context: {
        industry: 'software_development',
        processType: 'project_management',
        goal: 'Test goal',
      },
      conversation: [],
      extractedRequirements: [],
      createdAt: pastTime,
      updatedAt: pastTime,
      expiresAt: new Date(pastTime.getTime() + 2 * 60 * 60 * 1000), // Already expired
    });
  }

  static createActiveButExpiredSession(userId?: number): InterviewSession {
    const now = new Date();
    const pastTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
    
    // Create a mock that bypasses validation
    // This simulates a session that was active but time has expired
    const session = Object.create(InterviewSession.prototype);
    Object.assign(session, {
      sessionId: new SessionId(uuidv4()),
      userId: userId || 1,
      status: SessionStatus.ACTIVE,
      context: {
        industry: 'software_development',
        processType: 'project_management',
        goal: 'Test goal',
      },
      conversation: [],
      extractedRequirements: [],
      createdAt: pastTime,
      updatedAt: pastTime,
      expiresAt: new Date(pastTime.getTime() + 2 * 60 * 60 * 1000), // Already expired
    });
    
    return session as InterviewSession;
  }

  static createCompletedSession(userId?: number): InterviewSession {
    return TestDataFactory.createMockSession({
      userId: userId || 1,
      status: SessionStatus.COMPLETED,
    });
  }
}