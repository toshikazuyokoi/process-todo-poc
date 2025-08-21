import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InterviewSessionRepository } from '../../domain/ai-agent/repositories/interview-session.repository.interface';
import { InterviewSession } from '../../domain/ai-agent/entities/interview-session.entity';
import { ConversationMessage } from '../../domain/ai-agent/entities/conversation-message.entity';
import { ProcessRequirement } from '../../domain/ai-agent/entities/process-requirement.entity';
import { SessionStatus } from '../../domain/ai-agent/enums/session-status.enum';
import { MessageRole } from '../../domain/ai-agent/enums/message-role.enum';
import { RequirementCategory, RequirementPriority } from '../../domain/ai-agent/enums/requirement-category.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaInterviewSessionRepository implements InterviewSessionRepository {
  private readonly logger = new Logger(PrismaInterviewSessionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(session: InterviewSession): Promise<InterviewSession> {
    try {
      const data = this.toDbModel(session);
      
      const saved = await this.prisma.aIInterviewSession.upsert({
        where: { sessionId: session.getSessionIdString() },
        update: data,
        create: data,
      });

      return this.fromDbModel(saved);
    } catch (error) {
      this.logger.error('Failed to save interview session', error);
      throw new Error('Failed to save interview session');
    }
  }

  async findById(sessionId: string): Promise<InterviewSession | null> {
    try {
      const session = await this.prisma.aIInterviewSession.findUnique({
        where: { sessionId },
      });

      return session ? this.fromDbModel(session) : null;
    } catch (error) {
      this.logger.error(`Failed to find session by ID: ${sessionId}`, error);
      return null;
    }
  }

  async findByUserId(userId: number): Promise<InterviewSession[]> {
    try {
      const sessions = await this.prisma.aIInterviewSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return sessions.map(session => this.fromDbModel(session));
    } catch (error) {
      this.logger.error(`Failed to find sessions for user: ${userId}`, error);
      return [];
    }
  }

  async findActiveByUserId(userId: number): Promise<InterviewSession[]> {
    try {
      const sessions = await this.prisma.aIInterviewSession.findMany({
        where: {
          userId,
          status: SessionStatus.ACTIVE,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sessions.map(session => this.fromDbModel(session));
    } catch (error) {
      this.logger.error(`Failed to find active sessions for user: ${userId}`, error);
      return [];
    }
  }

  async findExpiredSessions(): Promise<InterviewSession[]> {
    try {
      const sessions = await this.prisma.aIInterviewSession.findMany({
        where: {
          status: SessionStatus.ACTIVE,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return sessions.map(session => this.fromDbModel(session));
    } catch (error) {
      this.logger.error('Failed to find expired sessions', error);
      return [];
    }
  }

  async updateConversation(
    sessionId: string,
    conversation: ConversationMessage[],
  ): Promise<void> {
    try {
      const conversationData = conversation.map(msg => ({
        id: msg.getId(),
        role: msg.getRole(),
        content: msg.getContent().getValue(),
        timestamp: msg.getTimestamp().toISOString(),
        metadata: msg.getMetadata(),
      }));

      await this.prisma.aIInterviewSession.update({
        where: { sessionId },
        data: {
          conversation: conversationData as Prisma.JsonArray,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update conversation for session: ${sessionId}`, error);
      throw new Error('Failed to update conversation');
    }
  }

  async updateRequirements(
    sessionId: string,
    requirements: ProcessRequirement[],
  ): Promise<void> {
    try {
      const requirementsData = requirements.map(req => ({
        id: req.getId(),
        category: req.getCategory(),
        description: req.getDescription(),
        priority: req.getPriority(),
        confidence: req.getConfidence().getValue(),
        extractedFrom: req.getExtractedFrom(),
        entities: req.getEntities(),
        createdAt: req.getCreatedAt().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await this.prisma.aIInterviewSession.update({
        where: { sessionId },
        data: {
          extractedRequirements: requirementsData as Prisma.JsonArray,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update requirements for session: ${sessionId}`, error);
      throw new Error('Failed to update requirements');
    }
  }

  async updateGeneratedTemplate(
    sessionId: string,
    template: any,
  ): Promise<void> {
    try {
      await this.prisma.aIInterviewSession.update({
        where: { sessionId },
        data: {
          generatedTemplate: template || Prisma.JsonNull,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update generated template for session: ${sessionId}`, error);
      throw new Error('Failed to update generated template');
    }
  }

  async markAsCompleted(sessionId: string): Promise<void> {
    try {
      await this.prisma.aIInterviewSession.update({
        where: { sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark session as completed: ${sessionId}`, error);
      throw new Error('Failed to mark session as completed');
    }
  }

  async markAsExpired(sessionId: string): Promise<void> {
    try {
      await this.prisma.aIInterviewSession.update({
        where: { sessionId },
        data: {
          status: SessionStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark session as expired: ${sessionId}`, error);
      throw new Error('Failed to mark session as expired');
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.prisma.aIInterviewSession.delete({
        where: { sessionId },
      });
    } catch (error) {
      this.logger.error(`Failed to delete session: ${sessionId}`, error);
      throw new Error('Failed to delete session');
    }
  }

  async deleteExpiredSessions(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.aIInterviewSession.deleteMany({
        where: {
          status: SessionStatus.EXPIRED,
          expiresAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete expired sessions', error);
      return 0;
    }
  }

  private toDbModel(session: InterviewSession): any {
    const json = session.toJSON();
    
    return {
      sessionId: json.sessionId,
      userId: json.userId,
      status: json.status,
      context: json.context as Prisma.JsonValue,
      conversation: json.conversation as Prisma.JsonArray,
      extractedRequirements: json.extractedRequirements as Prisma.JsonArray,
      generatedTemplate: json.generatedTemplate || null,
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      expiresAt: new Date(json.expiresAt),
    };
  }

  private fromDbModel(data: any): InterviewSession {
    const conversation = (data.conversation as any[] || []).map((msg: any) => {
      const metadata: any = msg.metadata || {};
      if (msg.role === MessageRole.USER) {
        return ConversationMessage.createUserMessage(msg.id, msg.content, metadata);
      } else {
        return ConversationMessage.createAssistantMessage(msg.id, msg.content, metadata);
      }
    });

    const requirements = (data.extractedRequirements as any[] || []).map((req: any) =>
      new ProcessRequirement({
        id: req.id,
        category: req.category as RequirementCategory,
        description: req.description,
        priority: req.priority as RequirementPriority,
        confidence: req.confidence,
        extractedFrom: req.extractedFrom,
        entities: req.entities,
        createdAt: new Date(req.createdAt),
      })
    );

    const session = new InterviewSession({
      sessionId: data.sessionId,
      userId: data.userId,
      status: data.status as SessionStatus,
      context: data.context as Record<string, any> || {},
      conversation,
      extractedRequirements: requirements,
      generatedTemplate: data.generatedTemplate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      expiresAt: data.expiresAt,
    });

    return session;
  }
}