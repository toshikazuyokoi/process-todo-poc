import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TemplateGenerationHistoryRepository,
  TemplateGenerationHistory,
  UserFeedback,
} from '../../domain/ai-agent/repositories/template-generation-history.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaTemplateGenerationHistoryRepository
  implements TemplateGenerationHistoryRepository
{
  private readonly logger = new Logger(PrismaTemplateGenerationHistoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(history: TemplateGenerationHistory): Promise<TemplateGenerationHistory> {
    try {
      const data = this.toDbModel(history);
      
      const saved = await this.prisma.aITemplateGenerationHistory.upsert({
        where: { id: history.id || 0 },
        update: data,
        create: data,
      });

      return this.fromDbModel(saved);
    } catch (error) {
      this.logger.error('Failed to save template generation history', error);
      throw new Error('Failed to save template generation history');
    }
  }

  async findById(id: number): Promise<TemplateGenerationHistory | null> {
    try {
      const history = await this.prisma.aITemplateGenerationHistory.findUnique({
        where: { id },
      });

      return history ? this.fromDbModel(history) : null;
    } catch (error) {
      this.logger.error(`Failed to find history by ID: ${id}`, error);
      return null;
    }
  }

  async findBySessionId(sessionId: string): Promise<TemplateGenerationHistory[]> {
    try {
      const histories = await this.prisma.aITemplateGenerationHistory.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error(`Failed to find history by session ID: ${sessionId}`, error);
      return [];
    }
  }

  async findByUserId(userId: number): Promise<TemplateGenerationHistory[]> {
    try {
      const histories = await this.prisma.aITemplateGenerationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error(`Failed to find history by user ID: ${userId}`, error);
      return [];
    }
  }

  async findByProcessTemplateId(processTemplateId: number): Promise<TemplateGenerationHistory | null> {
    try {
      const history = await this.prisma.aITemplateGenerationHistory.findFirst({
        where: { processTemplateId },
        orderBy: { createdAt: 'desc' },
      });

      return history ? this.fromDbModel(history) : null;
    } catch (error) {
      this.logger.error(`Failed to find history by process template ID: ${processTemplateId}`, error);
      return null;
    }
  }

  async addFeedback(historyId: number, feedback: UserFeedback): Promise<void> {
    try {
      const history = await this.prisma.aITemplateGenerationHistory.findUnique({
        where: { id: historyId },
      });

      if (!history) {
        throw new Error('History not found');
      }

      const existingFeedback = (history.userFeedback as any[]) || [];
      existingFeedback.push({
        ...feedback,
        createdAt: new Date().toISOString(),
      });

      await this.prisma.aITemplateGenerationHistory.update({
        where: { id: historyId },
        data: {
          userFeedback: existingFeedback as Prisma.JsonArray,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to add feedback to history: ${historyId}`, error);
      throw new Error('Failed to add feedback');
    }
  }

  async findSuccessfulGenerations(
    limit: number = 10,
  ): Promise<TemplateGenerationHistory[]> {
    try {
      const histories = await this.prisma.aITemplateGenerationHistory.findMany({
        where: {
          wasUsed: true,
          processTemplateId: {
            not: null,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error('Failed to find successful generations', error);
      return [];
    }
  }

  async getStatistics(userId?: number): Promise<Record<string, any>> {
    try {
      const where = userId ? { userId } : {};

      const [total, successful, failed, avgConfidence] = await Promise.all([
        this.prisma.aITemplateGenerationHistory.count({ where }),
        this.prisma.aITemplateGenerationHistory.count({
          where: { ...where, wasUsed: true },
        }),
        this.prisma.aITemplateGenerationHistory.count({
          where: { ...where, wasUsed: false },
        }),
        this.prisma.aITemplateGenerationHistory.aggregate({
          where,
          _avg: {
            confidenceScore: true,
          },
        }),
      ]);

      const successRate = total > 0 ? (successful / total) * 100 : 0;

      return {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        averageConfidence: avgConfidence._avg.confidenceScore || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get statistics', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        averageConfidence: 0,
      };
    }
  }

  async updateFeedback(id: number, feedback: UserFeedback, rating?: number): Promise<void> {
    try {
      const history = await this.prisma.aITemplateGenerationHistory.findUnique({
        where: { id },
      });

      if (!history) {
        throw new Error('History not found');
      }

      const updateData: any = {
        userFeedback: feedback as Prisma.JsonValue,
      };

      if (rating !== undefined) {
        updateData.feedbackRating = rating;
      }

      await this.prisma.aITemplateGenerationHistory.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(`Failed to update feedback for history: ${id}`, error);
      throw new Error('Failed to update feedback');
    }
  }

  async markAsUsed(id: number, processTemplateId: number, modifications?: any[]): Promise<void> {
    try {
      await this.prisma.aITemplateGenerationHistory.update({
        where: { id },
        data: {
          wasUsed: true,
          processTemplateId,
          modifications: modifications as Prisma.JsonArray,
          finalizedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark history as used: ${id}`, error);
      throw new Error('Failed to mark as used');
    }
  }

  async findHighRatedTemplates(minRating: number = 4, limit: number = 10): Promise<TemplateGenerationHistory[]> {
    try {
      const histories = await this.prisma.aITemplateGenerationHistory.findMany({
        where: {
          feedbackRating: {
            gte: minRating,
          },
        },
        orderBy: [
          { feedbackRating: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error('Failed to find high rated templates', error);
      return [];
    }
  }

  async getUserStatistics(userId: number): Promise<{
    totalGenerated: number;
    totalUsed: number;
    averageRating: number | null;
    averageConfidence: number | null;
  }> {
    try {
      const [totalGenerated, totalUsed, avgStats] = await Promise.all([
        this.prisma.aITemplateGenerationHistory.count({
          where: { userId },
        }),
        this.prisma.aITemplateGenerationHistory.count({
          where: { userId, wasUsed: true },
        }),
        this.prisma.aITemplateGenerationHistory.aggregate({
          where: { userId },
          _avg: {
            feedbackRating: true,
            confidenceScore: true,
          },
        }),
      ]);

      return {
        totalGenerated,
        totalUsed,
        averageRating: avgStats._avg.feedbackRating,
        averageConfidence: avgStats._avg.confidenceScore ? Number(avgStats._avg.confidenceScore) : null,
      };
    } catch (error) {
      this.logger.error(`Failed to get user statistics for user: ${userId}`, error);
      return {
        totalGenerated: 0,
        totalUsed: 0,
        averageRating: null,
        averageConfidence: null,
      };
    }
  }

  async deleteOlderThan(date: Date, keepUsed: boolean = true): Promise<number> {
    try {
      const where: any = {
        createdAt: {
          lt: date,
        },
      };

      if (keepUsed) {
        where.wasUsed = false;
      }

      const result = await this.prisma.aITemplateGenerationHistory.deleteMany({
        where,
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete old history records', error);
      return 0;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.aITemplateGenerationHistory.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete history: ${id}`, error);
      throw new Error('Failed to delete history');
    }
  }

  async findWithPositiveFeedback(limit: number = 10): Promise<TemplateGenerationHistory[]> {
    try {
      // Find histories with positive feedback
      const histories = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM ai_template_generation_history
        WHERE jsonb_array_length(user_feedback) > 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(user_feedback) AS feedback
          WHERE (feedback->>'rating')::int >= 4
        )
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error('Failed to find histories with positive feedback', error);
      return [];
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<TemplateGenerationHistory[]> {
    try {
      const histories = await this.prisma.aITemplateGenerationHistory.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error('Failed to find histories by date range', error);
      return [];
    }
  }

  private toDbModel(history: TemplateGenerationHistory): any {
    return {
      sessionId: history.sessionId,
      userId: history.userId,
      processTemplateId: history.processTemplateId,
      requirementsUsed: history.requirementsUsed as Prisma.JsonArray,
      generatedTemplate: history.generatedTemplate as Prisma.JsonValue,
      knowledgeSources: (history.knowledgeSources || []) as Prisma.JsonArray,
      researchSources: (history.researchSources || []) as Prisma.JsonArray,
      confidenceScore: history.confidenceScore,
      userFeedback: history.userFeedback as Prisma.JsonValue || Prisma.JsonNull,
      feedbackRating: history.feedbackRating,
      wasUsed: history.wasUsed || false,
      modifications: (history.modifications || []) as Prisma.JsonArray,
      createdAt: history.createdAt,
      finalizedAt: history.finalizedAt,
    };
  }

  private fromDbModel(data: any): TemplateGenerationHistory {
    return {
      id: data.id,
      sessionId: data.sessionId,
      userId: data.userId,
      processTemplateId: data.processTemplateId,
      requirementsUsed: data.requirementsUsed,
      generatedTemplate: data.generatedTemplate,
      knowledgeSources: data.knowledgeSources || [],
      researchSources: data.researchSources || [],
      confidenceScore: data.confidenceScore ? parseFloat(data.confidenceScore.toString()) : undefined,
      userFeedback: data.userFeedback,
      feedbackRating: data.feedbackRating,
      wasUsed: data.wasUsed,
      modifications: data.modifications || [],
      createdAt: data.createdAt,
      finalizedAt: data.finalizedAt,
    };
  }
}