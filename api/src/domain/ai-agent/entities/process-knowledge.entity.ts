/**
 * Knowledge Source Type
 */
export enum KnowledgeSourceType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  BEST_PRACTICE = 'best_practice',
  INDUSTRY_STANDARD = 'industry_standard',
  REGULATORY = 'regulatory',
  ACADEMIC = 'academic',
  CASE_STUDY = 'case_study'
}

/**
 * Knowledge Status
 */
export enum KnowledgeStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
  UNDER_REVIEW = 'under_review'
}

/**
 * Process Knowledge Entity
 * Represents domain knowledge about processes
 */
export class ProcessKnowledge {
  private readonly id: string;
  private readonly domain: string;
  private readonly processType: string;
  private readonly title: string;
  private readonly content: string;
  private readonly sourceType: KnowledgeSourceType;
  private readonly sourceUrl?: string;
  private readonly tags: string[];
  private readonly version: number;
  private readonly status: KnowledgeStatus;
  private readonly relevanceScore: number;
  private readonly usageCount: number;
  private readonly metadata?: Record<string, any>;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;
  private readonly lastAccessedAt?: Date;

  constructor(params: {
    id: string;
    domain: string;
    processType: string;
    title: string;
    content: string;
    sourceType: KnowledgeSourceType;
    sourceUrl?: string;
    tags?: string[];
    version?: number;
    status?: KnowledgeStatus;
    relevanceScore?: number;
    usageCount?: number;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
    lastAccessedAt?: Date;
  }) {
    this.id = params.id;
    this.domain = params.domain;
    this.processType = params.processType;
    this.title = params.title;
    this.content = params.content;
    this.sourceType = params.sourceType;
    this.sourceUrl = params.sourceUrl;
    this.tags = params.tags || [];
    this.version = params.version || 1;
    this.status = params.status || KnowledgeStatus.ACTIVE;
    this.relevanceScore = params.relevanceScore || 0.5;
    this.usageCount = params.usageCount || 0;
    this.metadata = params.metadata;
    this.createdAt = params.createdAt || new Date();
    this.updatedAt = params.updatedAt || new Date();
    this.lastAccessedAt = params.lastAccessedAt;

    this.validate();
  }

  /**
   * Validate knowledge entry
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('Knowledge ID is required');
    }

    if (!this.domain || this.domain.trim().length === 0) {
      throw new Error('Domain is required');
    }

    if (!this.processType || this.processType.trim().length === 0) {
      throw new Error('Process type is required');
    }

    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (!this.content || this.content.trim().length === 0) {
      throw new Error('Content is required');
    }

    if (this.relevanceScore < 0 || this.relevanceScore > 1) {
      throw new Error('Relevance score must be between 0 and 1');
    }

    if (this.version < 1) {
      throw new Error('Version must be positive');
    }

    if (this.usageCount < 0) {
      throw new Error('Usage count cannot be negative');
    }
  }

  /**
   * Get knowledge ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get domain
   */
  getDomain(): string {
    return this.domain;
  }

  /**
   * Get process type
   */
  getProcessType(): string {
    return this.processType;
  }

  /**
   * Get title
   */
  getTitle(): string {
    return this.title;
  }

  /**
   * Get content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get source type
   */
  getSourceType(): KnowledgeSourceType {
    return this.sourceType;
  }

  /**
   * Get source URL
   */
  getSourceUrl(): string | undefined {
    return this.sourceUrl;
  }

  /**
   * Get tags
   */
  getTags(): string[] {
    return [...this.tags];
  }

  /**
   * Get version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get status
   */
  getStatus(): KnowledgeStatus {
    return this.status;
  }

  /**
   * Get relevance score
   */
  getRelevanceScore(): number {
    return this.relevanceScore;
  }

  /**
   * Get usage count
   */
  getUsageCount(): number {
    return this.usageCount;
  }

  /**
   * Get metadata
   */
  getMetadata(): Record<string, any> | undefined {
    return this.metadata ? { ...this.metadata } : undefined;
  }

  /**
   * Get timestamps
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getLastAccessedAt(): Date | undefined {
    return this.lastAccessedAt;
  }

  /**
   * Check if knowledge is active
   */
  isActive(): boolean {
    return this.status === KnowledgeStatus.ACTIVE;
  }

  /**
   * Check if knowledge is deprecated
   */
  isDeprecated(): boolean {
    return this.status === KnowledgeStatus.DEPRECATED;
  }

  /**
   * Check if knowledge is from external source
   */
  isExternal(): boolean {
    return this.sourceType === KnowledgeSourceType.EXTERNAL;
  }

  /**
   * Check if knowledge is regulatory
   */
  isRegulatory(): boolean {
    return this.sourceType === KnowledgeSourceType.REGULATORY;
  }

  /**
   * Check if knowledge has high relevance
   */
  hasHighRelevance(threshold: number = 0.7): boolean {
    return this.relevanceScore > threshold;
  }

  /**
   * Check if knowledge is frequently used
   */
  isFrequentlyUsed(threshold: number = 10): boolean {
    return this.usageCount > threshold;
  }

  /**
   * Check if knowledge has tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Check if knowledge matches domain and process
   */
  matches(domain: string, processType: string): boolean {
    return this.domain === domain && this.processType === processType;
  }

  /**
   * Increment usage count
   */
  incrementUsage(): ProcessKnowledge {
    return new ProcessKnowledge({
      id: this.id,
      domain: this.domain,
      processType: this.processType,
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      sourceUrl: this.sourceUrl,
      tags: this.tags,
      version: this.version,
      status: this.status,
      relevanceScore: this.relevanceScore,
      usageCount: this.usageCount + 1,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Update relevance score
   */
  updateRelevance(score: number): ProcessKnowledge {
    if (score < 0 || score > 1) {
      throw new Error('Relevance score must be between 0 and 1');
    }

    return new ProcessKnowledge({
      id: this.id,
      domain: this.domain,
      processType: this.processType,
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      sourceUrl: this.sourceUrl,
      tags: this.tags,
      version: this.version,
      status: this.status,
      relevanceScore: score,
      usageCount: this.usageCount,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      lastAccessedAt: this.lastAccessedAt,
    });
  }

  /**
   * Archive knowledge
   */
  archive(): ProcessKnowledge {
    return new ProcessKnowledge({
      id: this.id,
      domain: this.domain,
      processType: this.processType,
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      sourceUrl: this.sourceUrl,
      tags: this.tags,
      version: this.version,
      status: KnowledgeStatus.ARCHIVED,
      relevanceScore: this.relevanceScore,
      usageCount: this.usageCount,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      lastAccessedAt: this.lastAccessedAt,
    });
  }

  /**
   * Deprecate knowledge
   */
  deprecate(): ProcessKnowledge {
    return new ProcessKnowledge({
      id: this.id,
      domain: this.domain,
      processType: this.processType,
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      sourceUrl: this.sourceUrl,
      tags: this.tags,
      version: this.version,
      status: KnowledgeStatus.DEPRECATED,
      relevanceScore: this.relevanceScore,
      usageCount: this.usageCount,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      lastAccessedAt: this.lastAccessedAt,
    });
  }

  /**
   * Get age in days
   */
  getAgeInDays(): number {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days since last access
   */
  getDaysSinceLastAccess(): number | undefined {
    if (!this.lastAccessedAt) return undefined;
    
    const now = new Date();
    const diff = now.getTime() - this.lastAccessedAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      domain: this.domain,
      processType: this.processType,
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      sourceUrl: this.sourceUrl,
      tags: this.tags,
      version: this.version,
      status: this.status,
      relevanceScore: this.relevanceScore,
      usageCount: this.usageCount,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastAccessedAt: this.lastAccessedAt?.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: Record<string, any>): ProcessKnowledge {
    return new ProcessKnowledge({
      id: data.id,
      domain: data.domain,
      processType: data.processType,
      title: data.title,
      content: data.content,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      tags: data.tags,
      version: data.version,
      status: data.status,
      relevanceScore: data.relevanceScore,
      usageCount: data.usageCount,
      metadata: data.metadata,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      lastAccessedAt: data.lastAccessedAt ? new Date(data.lastAccessedAt) : undefined,
    });
  }
}