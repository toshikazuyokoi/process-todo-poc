/**
 * Background Job Queue Interface
 * Defines the contract for job queue operations
 */

export enum JobType {
  WEB_RESEARCH = 'web_research',
  TEMPLATE_GENERATION = 'template_generation',
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  KNOWLEDGE_BASE_UPDATE = 'knowledge_base_update',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export interface JobData {
  sessionId?: string;
  userId: number;
  type: JobType;
  payload: any;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTimeMs?: number;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface BackgroundJobQueueInterface {
  /**
   * Add a job to the queue
   */
  addJob(data: JobData, options?: JobOptions): Promise<string>;

  /**
   * Get job status by ID
   */
  getJobStatus(jobId: string): Promise<JobStatus>;

  /**
   * Get job details by ID
   */
  getJob(jobId: string): Promise<any>;

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): Promise<boolean>;

  /**
   * Retry a failed job
   */
  retryJob(jobId: string): Promise<boolean>;

  /**
   * Get queue statistics
   */
  getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;

  /**
   * Clean old jobs
   */
  cleanOldJobs(grace: number): Promise<number>;

  /**
   * Pause the queue
   */
  pauseQueue(): Promise<void>;

  /**
   * Resume the queue
   */
  resumeQueue(): Promise<void>;
}