import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProcessKnowledgeRepository,
  ProcessKnowledge,
  BestPractice,
} from '../../domain/ai-agent/repositories/process-knowledge.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaProcessKnowledgeRepository implements ProcessKnowledgeRepository {
  private readonly logger = new Logger(PrismaProcessKnowledgeRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(knowledge: ProcessKnowledge): Promise<ProcessKnowledge> {
    try {
      const data = this.toDbModel(knowledge);
      
      const saved = await this.prisma.aIProcessKnowledge.upsert({
        where: { id: knowledge.id || 0 },
        update: data,
        create: data,
      });

      return this.fromDbModel(saved);
    } catch (error) {
      this.logger.error('Failed to save process knowledge', error);
      throw new Error('Failed to save process knowledge');
    }
  }

  async findById(id: number): Promise<ProcessKnowledge | null> {
    try {
      const knowledge = await this.prisma.aIProcessKnowledge.findUnique({
        where: { id },
      });

      return knowledge ? this.fromDbModel(knowledge) : null;
    } catch (error) {
      this.logger.error(`Failed to find knowledge by ID: ${id}`, error);
      return null;
    }
  }

  async findByCategory(category: string): Promise<ProcessKnowledge[]> {
    try {
      const knowledgeList = await this.prisma.aIProcessKnowledge.findMany({
        where: { category },
        orderBy: { confidence: 'desc' },
      });

      return knowledgeList.map(k => this.fromDbModel(k));
    } catch (error) {
      this.logger.error(`Failed to find knowledge by category: ${category}`, error);
      return [];
    }
  }

  async findByIndustry(industry: string): Promise<ProcessKnowledge[]> {
    try {
      const knowledgeList = await this.prisma.aIProcessKnowledge.findMany({
        where: { industry },
        orderBy: { confidence: 'desc' },
      });

      return knowledgeList.map(k => this.fromDbModel(k));
    } catch (error) {
      this.logger.error(`Failed to find knowledge by industry: ${industry}`, error);
      return [];
    }
  }

  async findByProcessType(processType: string): Promise<ProcessKnowledge[]> {
    try {
      const knowledgeList = await this.prisma.aIProcessKnowledge.findMany({
        where: { processType },
        orderBy: { confidence: 'desc' },
      });

      return knowledgeList.map(k => this.fromDbModel(k));
    } catch (error) {
      this.logger.error(`Failed to find knowledge by process type: ${processType}`, error);
      return [];
    }
  }

  async searchBestPractices(
    industry: string,
    processType: string,
  ): Promise<BestPractice[]> {
    try {
      const knowledgeList = await this.prisma.aIProcessKnowledge.findMany({
        where: {
          AND: [
            { industry },
            { processType },
            { category: 'best_practice' },
          ],
        },
        orderBy: { confidence: 'desc' },
        take: 20,
      });

      return knowledgeList.map(k => this.toBestPractice(k));
    } catch (error) {
      this.logger.error('Failed to search best practices', error);
      return [];
    }
  }

  async updateConfidence(id: number, confidence: number): Promise<void> {
    try {
      await this.prisma.aIProcessKnowledge.update({
        where: { id },
        data: {
          confidence,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update confidence for knowledge: ${id}`, error);
      throw new Error('Failed to update knowledge confidence');
    }
  }

  async incrementUsageCount(id: number): Promise<void> {
    try {
      await this.prisma.aIProcessKnowledge.update({
        where: { id },
        data: {
          usageCount: {
            increment: 1,
          },
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to increment usage count for knowledge: ${id}`, error);
      throw new Error('Failed to increment usage count');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.aIProcessKnowledge.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete knowledge: ${id}`, error);
      throw new Error('Failed to delete knowledge');
    }
  }

  async findPopular(limit: number = 10): Promise<ProcessKnowledge[]> {
    try {
      const knowledgeList = await this.prisma.aIProcessKnowledge.findMany({
        orderBy: [
          { usageCount: 'desc' },
          { confidence: 'desc' },
        ],
        take: limit,
      });

      return knowledgeList.map(k => this.fromDbModel(k));
    } catch (error) {
      this.logger.error('Failed to find popular knowledge', error);
      return [];
    }
  }

  async findRecent(limit: number = 10): Promise<ProcessKnowledge[]> {
    try {
      const knowledgeList = await this.prisma.aIProcessKnowledge.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return knowledgeList.map(k => this.fromDbModel(k));
    } catch (error) {
      this.logger.error('Failed to find recent knowledge', error);
      return [];
    }
  }

  async bulkInsert(knowledgeList: ProcessKnowledge[]): Promise<void> {
    try {
      const data = knowledgeList.map(k => this.toDbModel(k));
      
      await this.prisma.aIProcessKnowledge.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.error('Failed to bulk insert knowledge', error);
      throw new Error('Failed to bulk insert knowledge');
    }
  }

  private toDbModel(knowledge: ProcessKnowledge): any {
    return {
      category: knowledge.category,
      industry: knowledge.industry,
      processType: knowledge.processType,
      title: knowledge.title,
      description: knowledge.description,
      content: knowledge.content as Prisma.JsonValue,
      tags: knowledge.tags,
      source: knowledge.source,
      confidence: knowledge.confidence,
      usageCount: knowledge.usageCount || 0,
      lastUsedAt: knowledge.lastUsedAt,
      createdAt: knowledge.createdAt,
      updatedAt: knowledge.updatedAt || new Date(),
    };
  }

  private fromDbModel(data: any): ProcessKnowledge {
    return {
      id: data.id,
      category: data.category,
      industry: data.industry,
      processType: data.processType,
      title: data.title,
      description: data.description,
      content: data.content as Record<string, any>,
      tags: data.tags,
      source: data.source,
      confidence: data.confidence,
      usageCount: data.usageCount,
      lastUsedAt: data.lastUsedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toBestPractice(data: any): BestPractice {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      industry: data.industry,
      processType: data.processType,
      recommendations: (data.content as any)?.recommendations || [],
      benefits: (data.content as any)?.benefits || [],
      risks: (data.content as any)?.risks || [],
      source: data.source,
      confidence: data.confidence,
      tags: data.tags,
    };
  }
}