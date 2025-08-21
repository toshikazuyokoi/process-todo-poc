/**
 * Template Generation History Repository Interface
 * Handles persistence and retrieval of template generation history and feedback
 * Based on ai_agent_database_design.md specification (ai_template_generation_history table)
 */

/**
 * Template Generation History Entity
 * Represents a record of AI-generated template with feedback
 */
export interface TemplateGenerationHistory {
  id?: number;
  sessionId: string;
  userId: number;
  processTemplateId?: number; // Reference to created template if finalized
  generatedTemplate: any; // JSON structure of generated template
  requirementsUsed: any; // JSON structure of requirements used
  knowledgeSources?: any[]; // JSON array of knowledge sources used
  researchSources?: any[]; // JSON array of research sources used
  confidenceScore?: number; // 0.0 to 1.0
  userFeedback?: UserFeedback;
  feedbackRating?: number; // 1-5 rating
  wasUsed?: boolean; // Whether template was actually used
  modifications?: any[]; // JSON array of modifications made
  createdAt?: Date;
  finalizedAt?: Date;
}

/**
 * User Feedback Structure
 */
export interface UserFeedback {
  rating?: number;
  comments?: string;
  suggestions?: string[];
  issues?: string[];
}

export interface TemplateGenerationHistoryRepository {
  /**
   * Save new template generation history
   */
  save(history: TemplateGenerationHistory): Promise<TemplateGenerationHistory>;

  /**
   * Find generation history by session ID
   */
  findBySessionId(sessionId: string): Promise<TemplateGenerationHistory[]>;

  /**
   * Find generation history by user ID
   */
  findByUserId(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
      wasUsed?: boolean;
    }
  ): Promise<TemplateGenerationHistory[]>;

  /**
   * Find generation history by process template ID
   */
  findByProcessTemplateId(processTemplateId: number): Promise<TemplateGenerationHistory | null>;

  /**
   * Update user feedback for a generation
   */
  updateFeedback(
    id: number,
    feedback: UserFeedback,
    rating?: number
  ): Promise<void>;

  /**
   * Mark template as used (finalized to actual process template)
   */
  markAsUsed(
    id: number,
    processTemplateId: number,
    modifications?: any[]
  ): Promise<void>;

  /**
   * Get templates with high ratings for learning/improvement
   */
  findHighRatedTemplates(
    minRating?: number,
    limit?: number
  ): Promise<TemplateGenerationHistory[]>;

  /**
   * Get statistics for user's template generation
   */
  getUserStatistics(userId: number): Promise<{
    totalGenerated: number;
    totalUsed: number;
    averageRating: number | null;
    averageConfidence: number | null;
  }>;

  /**
   * Delete old history records (cleanup)
   */
  deleteOlderThan(date: Date, keepUsed?: boolean): Promise<number>;
}