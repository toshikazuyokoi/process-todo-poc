/**
 * Process Knowledge Repository Interface
 * Handles persistence and retrieval of process knowledge base
 * Based on ai_agent_class_diagram.md and ai_agent_database_design.md specifications
 */

/**
 * Process Knowledge Entity
 * Represents stored knowledge about processes, best practices, and industry standards
 */
export interface ProcessKnowledge {
  id?: number;
  category: string;
  industry: string;
  processType: string;
  title: string;
  description: string;
  content: any; // JSON content with flexible structure
  bestPractices?: BestPractice[];
  tags: string[];
  source: string;
  version: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Best Practice Entity
 */
export interface BestPractice {
  title: string;
  description: string;
  rationale: string;
  applicability: string[];
  constraints?: string[];
  benefits?: string[];
  risks?: string[];
}

export interface ProcessKnowledgeRepository {
  /**
   * Find process knowledge by category
   */
  findByCategory(category: string): Promise<ProcessKnowledge[]>;

  /**
   * Find process knowledge by industry
   */
  findByIndustry(industry: string): Promise<ProcessKnowledge[]>;

  /**
   * Find process knowledge by process type
   */
  findByProcessType(processType: string): Promise<ProcessKnowledge[]>;

  /**
   * Find best practices for specific industry and process type
   */
  findBestPractices(
    industry: string, 
    processType: string
  ): Promise<BestPractice[]>;

  /**
   * Save new process knowledge
   */
  save(knowledge: ProcessKnowledge): Promise<ProcessKnowledge>;

  /**
   * Update existing process knowledge
   */
  update(
    id: number, 
    knowledge: Partial<ProcessKnowledge>
  ): Promise<ProcessKnowledge>;

  /**
   * Delete process knowledge
   */
  delete(id: number): Promise<void>;

  /**
   * Find all active process knowledge
   */
  findActive(): Promise<ProcessKnowledge[]>;

  /**
   * Find process knowledge by version
   */
  findByVersion(version: number): Promise<ProcessKnowledge[]>;
}