import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProcessKnowledgeRepository, ProcessKnowledge, BestPractice } from '../ai-agent/repositories/process-knowledge.repository.interface';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Knowledge Base Manager Service
 * Handles management and administration of knowledge base content
 * Including industry templates, process types, and best practices
 */
@Injectable()
export class KnowledgeBaseManagerService {
  private readonly logger = new Logger(KnowledgeBaseManagerService.name);

  constructor(
    private readonly processKnowledgeRepository: ProcessKnowledgeRepository,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Get industry templates based on query parameters
   */
  async getIndustryTemplates(query: {
    industry?: string;
    search?: string;
    regulation?: string;
    process?: string;
    isActive?: boolean;
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    templates: IndustryTemplate[];
    total: number;
  }> {
    try {
      this.logger.log(`Getting industry templates with query: ${JSON.stringify(query)}`);

      const whereClause: any = {
        category: 'industry_template',
        isActive: query.isActive !== false,
      };

      if (query.industry) {
        whereClause.industry = query.industry;
      }

      if (query.minConfidence) {
        whereClause.confidenceScore = { gte: query.minConfidence };
      }

      if (query.search) {
        whereClause.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [templates, total] = await Promise.all([
        this.prismaService.aIProcessKnowledge.findMany({
          where: whereClause,
          skip: query.offset || 0,
          take: query.limit || 20,
          orderBy: { confidenceScore: 'desc' },
        }),
        this.prismaService.aIProcessKnowledge.count({ where: whereClause }),
      ]);

      return {
        templates: templates.map(this.mapToIndustryTemplate),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to get industry templates', error);
      throw new Error('Failed to retrieve industry templates');
    }
  }

  /**
   * Create a new industry template
   */
  async createIndustryTemplate(data: CreateIndustryTemplateData): Promise<IndustryTemplate> {
    try {
      this.logger.log(`Creating industry template: ${data.name}`);

      if (!this.validateIndustryTemplate(data)) {
        throw new BadRequestException('Invalid industry template data');
      }

      const knowledge: ProcessKnowledge = {
        category: 'industry_template',
        industry: data.name.toLowerCase().replace(/\s+/g, '_'),
        processType: 'general',
        title: data.name,
        description: `Industry template for ${data.name}`,
        content: {
          commonProcesses: data.commonProcesses,
          typicalStakeholders: data.typicalStakeholders,
          regulatoryRequirements: data.regulatoryRequirements,
          standardDurations: data.standardDurations || {},
        },
        tags: ['industry', 'template', data.name.toLowerCase()],
        source: 'manual_entry',
        confidence: 0.8,
        isActive: true,
      };

      const saved = await this.processKnowledgeRepository.save(knowledge);
      this.logOperation('createIndustryTemplate', { id: saved.id, name: data.name });

      return this.mapToIndustryTemplate(saved);
    } catch (error) {
      this.logger.error('Failed to create industry template', error);
      throw error;
    }
  }

  /**
   * Update an existing industry template
   */
  async updateIndustryTemplate(id: string, data: UpdateIndustryTemplateData): Promise<IndustryTemplate> {
    try {
      this.logger.log(`Updating industry template: ${id}`);

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException('Invalid template ID');
      }

      const existing = await this.prismaService.aIProcessKnowledge.findFirst({
        where: { 
          id: numericId,
          category: 'industry_template',
        },
      });

      if (!existing) {
        throw new NotFoundException('Industry template not found');
      }

      const updates: any = {
        updatedAt: new Date(),
      };

      if (data.name) {
        updates.title = data.name;
        updates.industry = data.name.toLowerCase().replace(/\s+/g, '_');
      }

      const content = existing.content as any || {};
      
      if (data.commonProcesses) {
        content.commonProcesses = data.commonProcesses;
      }
      if (data.typicalStakeholders) {
        content.typicalStakeholders = data.typicalStakeholders;
      }
      if (data.regulatoryRequirements) {
        content.regulatoryRequirements = data.regulatoryRequirements;
      }
      if (data.standardDurations) {
        content.standardDurations = data.standardDurations;
      }

      updates.content = content;

      const updated = await this.processKnowledgeRepository.update(numericId, updates);
      this.logOperation('updateIndustryTemplate', { id, updates: Object.keys(data) });

      return this.mapToIndustryTemplate(updated);
    } catch (error) {
      this.logger.error(`Failed to update industry template ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete an industry template
   */
  async deleteIndustryTemplate(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting industry template: ${id}`);

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException('Invalid template ID');
      }

      await this.processKnowledgeRepository.delete(numericId);
      this.logOperation('deleteIndustryTemplate', { id });
    } catch (error) {
      this.logger.error(`Failed to delete industry template ${id}`, error);
      throw error;
    }
  }

  /**
   * Get process types based on query parameters
   */
  async getProcessTypes(query: {
    category?: string;
    search?: string;
    deliverable?: string;
    hasPhase?: string;
    processType?: string;
    isActive?: boolean;
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    processTypes: ProcessTypeTemplate[];
    total: number;
    availableCategories?: string[];
  }> {
    try {
      this.logger.log(`Getting process types with query: ${JSON.stringify(query)}`);

      const whereClause: any = {
        category: 'process_type',
        isActive: query.isActive !== false,
      };

      if (query.category) {
        whereClause.processType = query.category;
      }

      if (query.minConfidence) {
        whereClause.confidenceScore = { gte: query.minConfidence };
      }

      if (query.search) {
        whereClause.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [processTypes, total] = await Promise.all([
        this.prismaService.aIProcessKnowledge.findMany({
          where: whereClause,
          skip: query.offset || 0,
          take: query.limit || 20,
          orderBy: { confidenceScore: 'desc' },
        }),
        this.prismaService.aIProcessKnowledge.count({ where: whereClause }),
      ]);

      // Get available categories
      const categories = await this.prismaService.aIProcessKnowledge.findMany({
        where: { category: 'process_type' },
        select: { processType: true },
        distinct: ['processType'],
      });

      return {
        processTypes: processTypes.map(this.mapToProcessType),
        total,
        availableCategories: categories.map(c => c.processType).filter((pt): pt is string => pt !== null),
      };
    } catch (error) {
      this.logger.error('Failed to get process types', error);
      throw new Error('Failed to retrieve process types');
    }
  }

  /**
   * Create a new process type
   */
  async createProcessType(data: CreateProcessTypeData): Promise<ProcessTypeTemplate> {
    try {
      this.logger.log(`Creating process type: ${data.name}`);

      if (!this.validateProcessType(data)) {
        throw new BadRequestException('Invalid process type data');
      }

      const knowledge: ProcessKnowledge = {
        category: 'process_type',
        industry: 'general',
        processType: data.category,
        title: data.name,
        description: `Process type template for ${data.name}`,
        content: {
          category: data.category,
          phases: data.phases,
          commonDeliverables: data.commonDeliverables,
          riskFactors: data.riskFactors || [],
        },
        tags: ['process', data.category, data.name.toLowerCase()],
        source: 'manual_entry',
        confidence: 0.8,
        isActive: true,
      };

      const saved = await this.processKnowledgeRepository.save(knowledge);
      this.logOperation('createProcessType', { id: saved.id, name: data.name });

      return this.mapToProcessType(saved);
    } catch (error) {
      this.logger.error('Failed to create process type', error);
      throw error;
    }
  }

  /**
   * Update an existing process type
   */
  async updateProcessType(id: string, data: UpdateProcessTypeData): Promise<ProcessTypeTemplate> {
    try {
      this.logger.log(`Updating process type: ${id}`);

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException('Invalid process type ID');
      }

      const existing = await this.prismaService.aIProcessKnowledge.findFirst({
        where: { 
          id: numericId,
          category: 'process_type',
        },
      });

      if (!existing) {
        throw new NotFoundException('Process type not found');
      }

      const updates: any = {
        updatedAt: new Date(),
      };

      if (data.name) {
        updates.title = data.name;
      }

      if (data.category) {
        updates.processType = data.category;
      }

      const content = existing.content as any || {};
      
      if (data.phases) {
        content.phases = data.phases;
      }
      if (data.commonDeliverables) {
        content.commonDeliverables = data.commonDeliverables;
      }
      if (data.riskFactors) {
        content.riskFactors = data.riskFactors;
      }

      updates.content = content;

      const updated = await this.processKnowledgeRepository.update(numericId, updates);
      this.logOperation('updateProcessType', { id, updates: Object.keys(data) });

      return this.mapToProcessType(updated);
    } catch (error) {
      this.logger.error(`Failed to update process type ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a process type
   */
  async deleteProcessType(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting process type: ${id}`);

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException('Invalid process type ID');
      }

      await this.processKnowledgeRepository.delete(numericId);
      this.logOperation('deleteProcessType', { id });
    } catch (error) {
      this.logger.error(`Failed to delete process type ${id}`, error);
      throw error;
    }
  }

  /**
   * Get best practices based on query parameters
   */
  async getBestPractices(query: {
    category?: string;
    search?: string;
    tags?: string[];
    source?: string;
    industry?: string;
    processType?: string;
    isActive?: boolean;
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    bestPractices: BestPracticeData[];
    total: number;
    availableCategories?: string[];
    popularTags?: string[];
  }> {
    try {
      this.logger.log(`Getting best practices with query: ${JSON.stringify(query)}`);

      const whereClause: any = {
        category: 'best_practice',
        isActive: query.isActive !== false,
      };

      if (query.industry) {
        whereClause.industry = query.industry;
      }

      if (query.processType) {
        whereClause.processType = query.processType;
      }

      if (query.minConfidence) {
        whereClause.confidenceScore = { gte: query.minConfidence };
      }

      if (query.search) {
        whereClause.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [bestPractices, total] = await Promise.all([
        this.prismaService.aIProcessKnowledge.findMany({
          where: whereClause,
          skip: query.offset || 0,
          take: query.limit || 20,
          orderBy: { confidenceScore: 'desc' },
        }),
        this.prismaService.aIProcessKnowledge.count({ where: whereClause }),
      ]);

      return {
        bestPractices: bestPractices.map(this.mapToBestPractice),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to get best practices', error);
      throw new Error('Failed to retrieve best practices');
    }
  }

  /**
   * Create a new best practice
   */
  async createBestPractice(data: CreateBestPracticeData): Promise<BestPracticeData> {
    try {
      this.logger.log(`Creating best practice: ${data.title}`);

      if (!this.validateBestPractice(data)) {
        throw new BadRequestException('Invalid best practice data');
      }

      const knowledge: ProcessKnowledge = {
        category: 'best_practice',
        industry: data.industry || 'general',
        processType: data.processType || 'general',
        title: data.title,
        description: data.description,
        content: {
          category: data.category,
          tags: data.tags,
          source: data.source,
          url: data.url,
        },
        tags: data.tags,
        source: data.source,
        confidence: data.confidence,
        isActive: true,
      };

      const saved = await this.processKnowledgeRepository.save(knowledge);
      this.logOperation('createBestPractice', { id: saved.id, title: data.title });

      return this.mapToBestPractice(saved);
    } catch (error) {
      this.logger.error('Failed to create best practice', error);
      throw error;
    }
  }

  /**
   * Update an existing best practice
   */
  async updateBestPractice(id: string, data: UpdateBestPracticeData): Promise<BestPracticeData> {
    try {
      this.logger.log(`Updating best practice: ${id}`);

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new BadRequestException('Invalid best practice ID');
      }

      const existing = await this.prismaService.aIProcessKnowledge.findFirst({
        where: { 
          id: numericId,
          category: 'best_practice',
        },
      });

      if (!existing) {
        throw new NotFoundException('Best practice not found');
      }

      const updates: any = {
        updatedAt: new Date(),
      };

      if (data.title) updates.title = data.title;
      if (data.description) updates.description = data.description;
      if (data.industry) updates.industry = data.industry;
      if (data.processType) updates.processType = data.processType;
      if (data.confidence !== undefined) updates.confidenceScore = data.confidence;
      if (data.source) updates.source = data.source;

      const content = existing.content as any || {};
      
      if (data.category) content.category = data.category;
      if (data.tags) content.tags = data.tags;
      if (data.url) content.url = data.url;

      updates.content = content;
      if (data.tags) updates.tags = data.tags;

      const updated = await this.processKnowledgeRepository.update(numericId, updates);
      this.logOperation('updateBestPractice', { id, updates: Object.keys(data) });

      return this.mapToBestPractice(updated);
    } catch (error) {
      this.logger.error(`Failed to update best practice ${id}`, error);
      throw error;
    }
  }

  /**
   * Bulk update best practices confidence scores
   */
  async bulkUpdateBestPractices(updates: Array<{ id: string; confidence: number }>): Promise<void> {
    try {
      this.logger.log(`Bulk updating ${updates.length} best practices`);

      const updatePromises = updates.map(async (update) => {
        const numericId = parseInt(update.id, 10);
        if (isNaN(numericId)) {
          this.logger.warn(`Skipping invalid ID: ${update.id}`);
          return;
        }

        return this.processKnowledgeRepository.update(numericId, {
          confidence: update.confidence,
          updatedAt: new Date(),
        });
      });

      await Promise.all(updatePromises);
      this.logOperation('bulkUpdateBestPractices', { count: updates.length });
    } catch (error) {
      this.logger.error('Failed to bulk update best practices', error);
      throw error;
    }
  }

  /**
   * Sync knowledge base from external sources
   */
  async syncKnowledgeBase(): Promise<SyncResult> {
    try {
      this.logger.log('Starting knowledge base sync');

      const result: SyncResult = {
        synchronized: 0,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
        timestamp: new Date(),
      };

      // Here we would implement actual sync logic with external sources
      // For now, just return a mock result
      
      // Example: Check for inactive items to clean up
      const inactiveItems = await this.prismaService.aIProcessKnowledge.updateMany({
        where: {
          isActive: false,
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
          },
        },
        data: {
          isActive: false,
        },
      });

      result.deleted = inactiveItems.count;
      result.synchronized = result.added + result.updated;

      this.logOperation('syncKnowledgeBase', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to sync knowledge base', error);
      throw error;
    }
  }

  /**
   * Validate industry template data
   */
  private validateIndustryTemplate(data: any): boolean {
    if (!data.name || typeof data.name !== 'string') return false;
    if (!Array.isArray(data.commonProcesses)) return false;
    if (!Array.isArray(data.typicalStakeholders)) return false;
    if (!Array.isArray(data.regulatoryRequirements)) return false;
    return true;
  }

  /**
   * Validate process type data
   */
  private validateProcessType(data: any): boolean {
    if (!data.name || typeof data.name !== 'string') return false;
    if (!data.category || typeof data.category !== 'string') return false;
    if (!Array.isArray(data.phases)) return false;
    if (!Array.isArray(data.commonDeliverables)) return false;
    
    // Validate phases structure
    for (const phase of data.phases) {
      if (!phase.name || !phase.description || typeof phase.typicalDuration !== 'number') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate best practice data
   */
  private validateBestPractice(data: any): boolean {
    if (!data.title || typeof data.title !== 'string') return false;
    if (!data.description || typeof data.description !== 'string') return false;
    if (!data.category || typeof data.category !== 'string') return false;
    if (!Array.isArray(data.tags)) return false;
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) return false;
    return true;
  }

  /**
   * Log operation for audit trail
   */
  private logOperation(operation: string, result: any): void {
    this.logger.log(`Operation: ${operation}`, result);
    // Here we could also save to audit log table
  }

  /**
   * Map database model to IndustryTemplate
   */
  private mapToIndustryTemplate(knowledge: any): IndustryTemplate {
    const content = knowledge.content as any || {};
    return {
      id: `ind-${knowledge.id}`,
      name: knowledge.title,
      commonProcesses: content.commonProcesses || [],
      typicalStakeholders: content.typicalStakeholders || [],
      regulatoryRequirements: content.regulatoryRequirements || [],
      standardDurations: content.standardDurations || {},
    };
  }

  /**
   * Map database model to ProcessTypeTemplate
   */
  private mapToProcessType(knowledge: any): ProcessTypeTemplate {
    const content = knowledge.content as any || {};
    return {
      id: `proc-${knowledge.id}`,
      name: knowledge.title,
      category: content.category || knowledge.processType,
      phases: content.phases || [],
      commonDeliverables: content.commonDeliverables || [],
      riskFactors: content.riskFactors || [],
    };
  }

  /**
   * Map database model to BestPractice
   */
  private mapToBestPractice(knowledge: any): BestPracticeData {
    const content = knowledge.content as any || {};
    return {
      id: `bp-${knowledge.id}`,
      title: knowledge.title,
      description: knowledge.description || '',
      category: content.category || 'general',
      industry: knowledge.industry,
      processType: knowledge.processType,
      tags: content.tags || knowledge.tags || [],
      confidence: knowledge.confidenceScore || 0.5,
      source: knowledge.source,
      url: content.url,
    };
  }
}

// Type definitions for this service
interface IndustryTemplate {
  id: string;
  name: string;
  commonProcesses: string[];
  typicalStakeholders: string[];
  regulatoryRequirements: string[];
  standardDurations: Record<string, number>;
}

interface ProcessTypeTemplate {
  id: string;
  name: string;
  category: string;
  phases: ProcessPhase[];
  commonDeliverables: string[];
  riskFactors: string[];
}

interface ProcessPhase {
  name: string;
  description: string;
  typicalDuration: number;
  requiredRoles: string[];
  deliverables: string[];
  dependencies: string[];
  parallelizable: boolean;
}

interface BestPracticeData {
  id: string;
  title: string;
  description: string;
  category: string;
  industry?: string;
  processType?: string;
  tags: string[];
  confidence: number;
  source: string;
  url?: string;
}

interface CreateIndustryTemplateData {
  name: string;
  commonProcesses: string[];
  typicalStakeholders: string[];
  regulatoryRequirements: string[];
  standardDurations?: Record<string, number>;
}

interface UpdateIndustryTemplateData {
  name?: string;
  commonProcesses?: string[];
  typicalStakeholders?: string[];
  regulatoryRequirements?: string[];
  standardDurations?: Record<string, number>;
}

interface CreateProcessTypeData {
  name: string;
  category: string;
  phases: ProcessPhase[];
  commonDeliverables: string[];
  riskFactors?: string[];
}

interface UpdateProcessTypeData {
  name?: string;
  category?: string;
  phases?: ProcessPhase[];
  commonDeliverables?: string[];
  riskFactors?: string[];
}

interface CreateBestPracticeData {
  title: string;
  description: string;
  category: string;
  industry?: string;
  processType?: string;
  tags: string[];
  confidence: number;
  source: string;
  url?: string;
}

interface UpdateBestPracticeData {
  title?: string;
  description?: string;
  category?: string;
  industry?: string;
  processType?: string;
  tags?: string[];
  confidence?: number;
  source?: string;
  url?: string;
}

interface SyncResult {
  synchronized: number;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
  timestamp: Date;
}