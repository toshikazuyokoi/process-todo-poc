import { Job } from 'bull';
import { JobType, JobResult } from './background-job-queue.interface';

/**
 * Job Processor Interface
 * Defines the contract for processing different job types
 */
export interface JobProcessorInterface {
  /**
   * Process a job
   */
  process(job: Job): Promise<JobResult>;

  /**
   * Get supported job type
   */
  getJobType(): JobType;

  /**
   * Validate job data before processing
   */
  validateJobData(data: any): boolean;

  /**
   * Handle job failure
   */
  handleFailure(job: Job, error: Error): Promise<void>;

  /**
   * Handle job success
   */
  handleSuccess(job: Job, result: JobResult): Promise<void>;
}

/**
 * Base Job Processor
 * Abstract class providing common functionality for job processors
 */
export abstract class BaseJobProcessor implements JobProcessorInterface {
  abstract getJobType(): JobType;
  
  abstract process(job: Job): Promise<JobResult>;
  
  validateJobData(data: any): boolean {
    // Default validation - can be overridden
    return data && typeof data === 'object';
  }
  
  async handleFailure(job: Job, error: Error): Promise<void> {
    console.error(`Job ${job.id} failed:`, error);
    // Can be overridden for specific error handling
  }
  
  async handleSuccess(job: Job, result: JobResult): Promise<void> {
    console.log(`Job ${job.id} completed successfully`);
    // Can be overridden for specific success handling
  }
  
  /**
   * Helper method to update job progress
   */
  protected async updateProgress(job: Job, progress: number): Promise<void> {
    await job.progress(progress);
  }
  
  /**
   * Helper method to log job activity
   */
  protected logActivity(job: Job, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const logMessage = `[Job ${job.id}] [${this.getJobType()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}