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

  async findByTemplateId(templateId: number): Promise<TemplateGenerationHistory[]> {
    try {
      const histories = await this.prisma.aITemplateGenerationHistory.findMany({
        where: { templateId },
        orderBy: { createdAt: 'desc' },
      });

      return histories.map(h => this.fromDbModel(h));
    } catch (error) {
      this.logger.error(`Failed to find history by template ID: ${templateId}`, error);
      return [];
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
          updatedAt: new Date(),
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
          generationStatus: 'success',
          templateId: {
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
          where: { ...where, generationStatus: 'success' },
        }),
        this.prisma.aITemplateGenerationHistory.count({
          where: { ...where, generationStatus: 'failed' },
        }),
        this.prisma.aITemplateGenerationHistory.aggregate({
          where,
          _avg: {
            confidence: true,
          },
        }),
      ]);

      const successRate = total > 0 ? (successful / total) * 100 : 0;

      return {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        averageConfidence: avgConfidence._avg.confidence || 0,
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
      templateId: history.templateId,
      requirements: history.requirements as Prisma.JsonArray,
      generatedTemplate: history.generatedTemplate as Prisma.JsonValue,
      confidence: history.confidence,
      generationTime: history.generationTime,
      tokensUsed: history.tokensUsed,
      generationStatus: history.generationStatus,
      errorMessage: history.errorMessage,
      userFeedback: (history.userFeedback || []) as Prisma.JsonArray,
      metadata: history.metadata as Prisma.JsonValue,
      createdAt: history.createdAt,
      updatedAt: history.updatedAt || new Date(),
    };
  }

  private fromDbModel(data: any): TemplateGenerationHistory {
    return {
      id: data.id,
      sessionId: data.sessionId,
      userId: data.userId,
      templateId: data.templateId,
      requirements: data.requirements as any[],
      generatedTemplate: data.generatedTemplate as Record<string, any>,
      confidence: data.confidence,
      generationTime: data.generationTime,
      tokensUsed: data.tokensUsed,
      generationStatus: data.generationStatus,
      errorMessage: data.errorMessage,
      userFeedback: (data.userFeedback as any[]) || [],
      metadata: data.metadata as Record<string, any>,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}