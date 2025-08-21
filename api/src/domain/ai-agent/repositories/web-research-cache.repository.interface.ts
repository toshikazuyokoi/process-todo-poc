/**
 * Research Result
 */
export interface ResearchResult {
  id: string;
  query: string;
  url: string;
  title: string;
  content: string;
  summary?: string;
  relevanceScore: number;
  source: 'web' | 'documentation' | 'github' | 'stackoverflow' | 'other';
  metadata?: {
    author?: string;
    publishedDate?: Date;
    lastModified?: Date;
    tags?: string[];
    language?: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Research Query Options
 */
export interface ResearchQueryOptions {
  limit?: number;
  offset?: number;
  sources?: Array<'web' | 'documentation' | 'github' | 'stackoverflow' | 'other'>;
  minRelevance?: number;
  includeExpired?: boolean;
}

/**
 * Web Research Cache Repository Interface
 * Caches web research results for reuse
 */
export interface WebResearchCacheRepository {
  /**
   * Store research result
   */
  store(result: Omit<ResearchResult, 'id' | 'createdAt'>): Promise<ResearchResult>;

  /**
   * Store multiple research results
   */
  storeBatch(results: Array<Omit<ResearchResult, 'id' | 'createdAt'>>): Promise<ResearchResult[]>;

  /**
   * Find cached result by ID
   */
  findById(id: string): Promise<ResearchResult | null>;

  /**
   * Find cached results by query
   */
  findByQuery(query: string, options?: ResearchQueryOptions): Promise<ResearchResult[]>;

  /**
   * Find similar queries
   */
  findSimilarQueries(query: string, threshold?: number): Promise<string[]>;

  /**
   * Find results by URL
   */
  findByUrl(url: string): Promise<ResearchResult[]>;

  /**
   * Find results by source
   */
  findBySource(source: ResearchResult['source'], options?: {
    limit?: number;
    offset?: number;
    minRelevance?: number;
  }): Promise<ResearchResult[]>;

  /**
   * Check if query is cached and valid
   */
  isCached(query: string): Promise<boolean>;

  /**
   * Get cache hit rate statistics
   */
  getCacheStatistics(): Promise<{
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    hitRate: number;
    averageRelevance: number;
    topQueries: Array<{ query: string; count: number }>;
    topSources: Array<{ source: string; count: number }>;
  }>;

  /**
   * Update relevance score
   */
  updateRelevance(id: string, relevanceScore: number): Promise<boolean>;

  /**
   * Extend expiration time
   */
  extendExpiration(id: string, days: number): Promise<boolean>;

  /**
   * Delete expired entries
   */
  deleteExpired(): Promise<number>;

  /**
   * Delete entry by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete entries by query
   */
  deleteByQuery(query: string): Promise<number>;

  /**
   * Clear entire cache
   */
  clear(): Promise<void>;

  /**
   * Get most relevant results across all queries
   */
  getTopResults(limit?: number): Promise<ResearchResult[]>;

  /**
   * Get recent queries
   */
  getRecentQueries(limit?: number): Promise<Array<{
    query: string;
    count: number;
    lastAccessed: Date;
  }>>;

  /**
   * Mark result as used
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Get usage statistics for a result
   */
  getUsageStats(id: string): Promise<{
    accessCount: number;
    lastAccessed: Date;
    firstAccessed: Date;
  }>;
}