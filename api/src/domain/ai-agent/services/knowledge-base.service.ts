import { Injectable, Logger } from '@nestjs/common';
import { ComplexityLevel } from '../entities/process-analysis.entity';
import { ProcessKnowledgeRepository } from '../repositories/process-knowledge.repository.interface';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * Knowledge Base Service
 * Handles search and retrieval operations for knowledge base content
 * Works in conjunction with KnowledgeBaseManagerService for management operations
 */
@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly processKnowledgeRepository: ProcessKnowledgeRepository,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Search knowledge base with full-text search
   */
  async searchKnowledge(query: string, filters?: {
    industry?: string;
    processType?: string;
    category?: string;
    minConfidence?: number;
    limit?: number;
  }): Promise<{
    results: Array<{
      id: string;
      title: string;
      content: string;
      relevance: number;
      category?: string;
      industry?: string;
      processType?: string;
      confidence?: number;
    }>;
    totalResults: number;
  }> {
    try {
      this.logger.log(`Searching knowledge base for: ${query}`);

      const whereClause: any = {
        isActive: true,
      };

      if (filters?.industry) {
        whereClause.industry = filters.industry;
      }

      if (filters?.processType) {
        whereClause.processType = filters.processType;
      }

      if (filters?.category) {
        whereClause.category = filters.category;
      }

      if (filters?.minConfidence) {
        whereClause.confidenceScore = { gte: filters.minConfidence };
      }

      // Full-text search on title and description
      if (query) {
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      const results = await this.prismaService.aIProcessKnowledge.findMany({
        where: whereClause,
        take: filters?.limit || 20,
        orderBy: { confidenceScore: 'desc' },
      });

      // Calculate relevance based on query match
      const scoredResults = results.map(item => {
        const titleMatch = item.title?.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0;
        const descMatch = item.description?.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
        const relevance = titleMatch + descMatch + (item.confidenceScore?.toNumber() || 0) * 0.2;

        return {
          id: `kb-${item.id}`,
          title: item.title || '',
          content: item.description || '',
          relevance: Math.min(relevance, 1),
          category: item.category,
          industry: item.industry,
          processType: item.processType,
          confidence: item.confidenceScore?.toNumber(),
        };
      });

      // Sort by relevance
      scoredResults.sort((a, b) => b.relevance - a.relevance);

      return {
        results: scoredResults,
        totalResults: scoredResults.length,
      };
    } catch (error) {
      this.logger.error('Failed to search knowledge base', error);
      return { results: [], totalResults: 0 };
    }
  }

  /**
   * Add new knowledge to the knowledge base
   * Delegates to ProcessKnowledgeRepository for persistence
   */
  async addKnowledge(knowledge: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    industry?: string;
    processType?: string;
    source?: string;
    confidence?: number;
  }): Promise<{ id: string; success: boolean }> {
    try {
      this.logger.log(`Adding knowledge: ${knowledge.title}`);

      const saved = await this.processKnowledgeRepository.save({
        category: knowledge.category,
        industry: knowledge.industry || 'general',
        processType: knowledge.processType || 'general',
        title: knowledge.title,
        description: knowledge.content,
        content: {
          tags: knowledge.tags,
          source: knowledge.source,
        },
        tags: knowledge.tags,
        source: knowledge.source || 'user_contributed',
        confidence: knowledge.confidence || 0.7,
        isActive: true,
      });

      return {
        id: `kb-${saved.id}`,
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to add knowledge', error);
      return {
        id: '',
        success: false,
      };
    }
  }

  /**
   * Update existing knowledge entry
   */
  async updateKnowledge(id: string, updates: {
    title?: string;
    content?: string;
    tags?: string[];
    confidence?: number;
  }): Promise<void> {
    try {
      this.logger.log(`Updating knowledge: ${id}`);

      const numericId = parseInt(id.replace('kb-', ''), 10);
      if (isNaN(numericId)) {
        throw new Error('Invalid knowledge ID');
      }

      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.content) updateData.description = updates.content;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.confidence !== undefined) updateData.confidence = updates.confidence;

      await this.processKnowledgeRepository.update(numericId, updateData);
    } catch (error) {
      this.logger.error(`Failed to update knowledge ${id}`, error);
      throw error;
    }
  }

  /**
   * Get related knowledge entries based on similarity
   */
  async getRelatedKnowledge(id: string, limit: number = 5): Promise<{
    related: Array<{
      id: string;
      title: string;
      similarity: number;
      category?: string;
      tags?: string[];
    }>;
  }> {
    try {
      this.logger.log(`Getting related knowledge for: ${id}`);

      const numericId = parseInt(id.replace('kb-', ''), 10);
      if (isNaN(numericId)) {
        return { related: [] };
      }

      // Get the source knowledge item
      const source = await this.prismaService.aIProcessKnowledge.findUnique({
        where: { id: numericId },
      });

      if (!source) {
        return { related: [] };
      }

      // Find related items based on category, industry, and tags
      const related = await this.prismaService.aIProcessKnowledge.findMany({
        where: {
          id: { not: numericId },
          isActive: true,
          OR: [
            { category: source.category },
            { industry: source.industry },
            { processType: source.processType },
          ],
        },
        take: limit * 2, // Get more to filter later
        orderBy: { confidenceScore: 'desc' },
      });

      // Calculate similarity scores
      const scoredRelated = related.map(item => {
        let similarity = 0;
        
        // Category match
        if (item.category === source.category) similarity += 0.4;
        
        // Industry match
        if (item.industry === source.industry) similarity += 0.3;
        
        // Process type match
        if (item.processType === source.processType) similarity += 0.3;
        
        return {
          id: `kb-${item.id}`,
          title: item.title || '',
          similarity,
          category: item.category,
          tags: (item.content as any)?.tags || [],
        };
      });

      // Sort by similarity and take top results
      scoredRelated.sort((a, b) => b.similarity - a.similarity);
      
      return {
        related: scoredRelated.slice(0, limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get related knowledge for ${id}`, error);
      return { related: [] };
    }
  }

  /**
   * Get templates related to specific criteria
   */
  async getRelatedTemplates(params: {
    industry?: string;
    processType?: string;
    category?: string;
    complexity?: ComplexityLevel;
    query?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    description: string;
    industry?: string;
    processType?: string;
    complexity?: ComplexityLevel;
    tags?: string[];
    confidence?: number;
    createdAt?: Date;
  }>> {
    try {
      this.logger.log(`Getting related templates with params: ${JSON.stringify(params)}`);

      const whereClause: any = {
        category: 'template',
        isActive: true,
      };

      if (params.industry) {
        whereClause.industry = params.industry;
      }

      if (params.processType) {
        whereClause.processType = params.processType;
      }

      if (params.query) {
        whereClause.OR = [
          { title: { contains: params.query, mode: 'insensitive' } },
          { description: { contains: params.query, mode: 'insensitive' } },
        ];
      }

      const templates = await this.prismaService.aIProcessKnowledge.findMany({
        where: whereClause,
        take: 10,
        orderBy: [
          { confidenceScore: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return templates.map(template => ({
        id: `template-${template.id}`,
        name: template.title || '',
        description: template.description || '',
        industry: template.industry,
        processType: template.processType,
        complexity: (template.content as any)?.complexity,
        tags: (template.content as any)?.tags || [],
        confidence: template.confidenceScore?.toNumber(),
        createdAt: template.createdAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get related templates', error);
      return [];
    }
  }

  /**
   * Get trending or popular knowledge items
   */
  async getTrendingKnowledge(limit: number = 10): Promise<Array<{
    id: string;
    title: string;
    category: string;
    usageCount: number;
    confidence: number;
  }>> {
    try {
      this.logger.log('Getting trending knowledge items');

      const trending = await this.prismaService.aIProcessKnowledge.findMany({
        where: {
          isActive: true,
          confidenceScore: { gte: 0.7 },
        },
        take: limit,
        orderBy: [
          { confidenceScore: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      return trending.map(item => ({
        id: `kb-${item.id}`,
        title: item.title || '',
        category: item.category || '',
        usageCount: 0, // Would be tracked in usage statistics
        confidence: item.confidenceScore?.toNumber() || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get trending knowledge', error);
      return [];
    }
  }
}