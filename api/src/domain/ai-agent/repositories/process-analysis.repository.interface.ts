import { ProcessAnalysis } from '../entities/process-analysis.entity';
import { ProcessCategory, ComplexityLevel } from '../entities/process-analysis.entity';

/**
 * Analysis Search Options
 */
export interface AnalysisSearchOptions {
  userId?: number;
  sessionId?: string;
  processType?: ProcessCategory;
  complexity?: ComplexityLevel;
  minConfidence?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'analyzedAt' | 'confidence' | 'complexity';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Process Analysis Repository Interface
 * Manages process analysis results
 */
export interface ProcessAnalysisRepository {
  /**
   * Save analysis result
   */
  create(analysis: ProcessAnalysis): Promise<ProcessAnalysis>;

  /**
   * Update analysis result
   */
  update(id: string, analysis: ProcessAnalysis): Promise<ProcessAnalysis>;

  /**
   * Find analysis by ID
   */
  findById(id: string): Promise<ProcessAnalysis | null>;

  /**
   * Find analyses by session ID
   */
  findBySessionId(sessionId: string): Promise<ProcessAnalysis[]>;

  /**
   * Find analyses by user ID
   */
  findByUserId(userId: number, options?: AnalysisSearchOptions): Promise<ProcessAnalysis[]>;

  /**
   * Search analyses
   */
  search(options: AnalysisSearchOptions): Promise<ProcessAnalysis[]>;

  /**
   * Find similar analyses
   */
  findSimilar(analysisId: string, limit?: number): Promise<ProcessAnalysis[]>;

  /**
   * Find analyses by process type
   */
  findByProcessType(processType: ProcessCategory, options?: {
    complexity?: ComplexityLevel;
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<ProcessAnalysis[]>;

  /**
   * Find analyses by complexity
   */
  findByComplexity(complexity: ComplexityLevel, options?: {
    processType?: ProcessCategory;
    limit?: number;
    offset?: number;
  }): Promise<ProcessAnalysis[]>;

  /**
   * Get statistics for a user
   */
  getUserStatistics(userId: number): Promise<{
    totalAnalyses: number;
    averageConfidence: number;
    processTypeDistribution: Record<ProcessCategory, number>;
    complexityDistribution: Record<ComplexityLevel, number>;
    averageDuration: number;
    averageStakeholders: number;
    averageDeliverables: number;
  }>;

  /**
   * Get global statistics
   */
  getGlobalStatistics(): Promise<{
    totalAnalyses: number;
    averageConfidence: number;
    topProcessTypes: Array<{ type: ProcessCategory; count: number }>;
    complexityTrends: Array<{ date: string; complexity: ComplexityLevel; count: number }>;
    averageRiskScore: number;
    complianceRate: number;
  }>;

  /**
   * Get analyses with high risks
   */
  findHighRiskAnalyses(limit?: number): Promise<ProcessAnalysis[]>;

  /**
   * Get analyses with compliance requirements
   */
  findWithComplianceRequirements(regulation?: string): Promise<ProcessAnalysis[]>;

  /**
   * Delete analysis
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete analyses older than date
   */
  deleteOlderThan(date: Date): Promise<number>;

  /**
   * Archive analysis
   */
  archive(id: string): Promise<boolean>;

  /**
   * Export analyses
   */
  export(options?: AnalysisSearchOptions): Promise<ProcessAnalysis[]>;

  /**
   * Get recent analyses
   */
  getRecent(limit?: number): Promise<ProcessAnalysis[]>;

  /**
   * Get analyses by stakeholder
   */
  findByStakeholder(stakeholderName: string): Promise<ProcessAnalysis[]>;

  /**
   * Get analyses by deliverable type
   */
  findByDeliverableType(type: 'document' | 'artifact' | 'approval' | 'milestone'): Promise<ProcessAnalysis[]>;

  /**
   * Count analyses by criteria
   */
  count(options?: AnalysisSearchOptions): Promise<number>;
}