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

  // Knowledge Base test data factories
  static createMockIndustryTemplate(overrides?: Partial<any>) {
    return {
      id: overrides?.id || 'ind-001',
      name: overrides?.name || 'Software Development',
      commonProcesses: overrides?.commonProcesses || ['Agile Development', 'Waterfall', 'DevOps'],
      typicalStakeholders: overrides?.typicalStakeholders || ['Product Manager', 'Developer', 'QA Engineer', 'Designer'],
      regulatoryRequirements: overrides?.regulatoryRequirements || ['GDPR', 'SOC 2', 'ISO 27001'],
      standardDurations: overrides?.standardDurations || { 
        planning: 40,
        development: 160,
        testing: 80,
        deployment: 20,
      },
    };
  }

  static createMockProcessType(overrides?: Partial<any>) {
    return {
      id: overrides?.id || 'proc-001',
      name: overrides?.name || 'Scrum Development Process',
      category: overrides?.category || 'development',
      phases: overrides?.phases || [
        {
          name: 'Sprint Planning',
          description: 'Plan the work for the upcoming sprint',
          typicalDuration: 4,
          requiredRoles: ['Product Owner', 'Scrum Master', 'Development Team'],
          deliverables: ['Sprint Backlog', 'Sprint Goal'],
          dependencies: ['Product Backlog'],
          parallelizable: false,
        },
        {
          name: 'Sprint Execution',
          description: 'Execute the planned work',
          typicalDuration: 80,
          requiredRoles: ['Development Team', 'Scrum Master'],
          deliverables: ['Working Software Increment', 'Updated Burndown Chart'],
          dependencies: ['Sprint Backlog'],
          parallelizable: true,
        },
      ],
      commonDeliverables: overrides?.commonDeliverables || ['Sprint Backlog', 'Product Increment', 'Sprint Review Report'],
      riskFactors: overrides?.riskFactors || ['Scope Creep', 'Technical Debt', 'Resource Availability'],
    };
  }

  static createMockBestPractice(overrides?: Partial<any>) {
    return {
      id: overrides?.id || 'bp-001',
      title: overrides?.title || 'Daily Standup Meetings',
      description: overrides?.description || 'Conduct daily synchronization meetings to align team members',
      category: overrides?.category || 'efficiency',
      applicableProcessTypes: overrides?.applicableProcessTypes || ['scrum', 'agile', 'kanban'],
      tags: overrides?.tags || ['agile', 'communication', 'team-sync'],
      confidenceScore: overrides?.confidenceScore !== undefined ? overrides.confidenceScore : 0.85,
      expectedImpact: overrides?.expectedImpact || 'Improved team communication and early issue detection',
      implementationGuidelines: overrides?.implementationGuidelines || [
        'Keep meetings to 15 minutes',
        'Focus on what was done, what will be done, and blockers',
        'Stand during the meeting to keep it short',
      ],
      prerequisites: overrides?.prerequisites || ['Team commitment', 'Fixed daily time slot'],
      risks: overrides?.risks || ['Meeting fatigue if not managed properly'],
      metrics: overrides?.metrics || ['Team velocity', 'Blocker resolution time'],
    };
  }

  static createMockProcessKnowledge(overrides?: Partial<any>) {
    return {
      id: overrides?.id || 1,
      category: overrides?.category || 'best_practice',
      industry: overrides?.industry || 'software',
      processType: overrides?.processType || 'development',
      title: overrides?.title || 'Test Knowledge',
      description: overrides?.description || 'Test knowledge description',
      content: overrides?.content || { detail: 'Test content detail' },
      tags: overrides?.tags || ['test', 'mock'],
      confidenceScore: overrides?.confidenceScore !== undefined ? overrides.confidenceScore : 0.75,
      source: overrides?.source || 'test-source',
      sourceUrl: overrides?.sourceUrl || 'https://test.example.com',
      isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
      createdAt: overrides?.createdAt || new Date(),
      updatedAt: overrides?.updatedAt || new Date(),
    };
  }

  static createMockBulkUpdateResult(overrides?: Partial<any>) {
    return {
      totalUpdated: overrides?.totalUpdated !== undefined ? overrides.totalUpdated : 5,
      updatedIds: overrides?.updatedIds || ['bp-001', 'bp-002', 'bp-003', 'bp-004', 'bp-005'],
      failures: overrides?.failures || [],
    };
  }
}