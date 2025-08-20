import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import {
  BackgroundJobQueueInterface,
  JobData,
  JobOptions,
  JobStatus,
  JobType,
} from './background-job-queue.interface';
import { AIConfigService } from '../../config/ai-config.service';

/**
 * Bull Queue Implementation for Background Jobs
 */
@Injectable()
export class BullJobQueueService implements BackgroundJobQueueInterface, OnModuleDestroy {
  constructor(
    @InjectQueue('ai-jobs') private readonly queue: Queue,
    private readonly aiConfigService: AIConfigService,
  ) {}

  async onModuleDestroy() {
    await this.queue.close();
  }

  async addJob(data: JobData, options?: JobOptions): Promise<string> {
    const jobId = uuidv4();
    
    const jobOptions = {
      jobId,
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.attempts || this.aiConfigService.jobDefaultRetries,
      backoff: options?.backoff || {
        type: 'exponential' as const,
        delay: this.aiConfigService.jobDefaultBackoffDelay,
      },
      removeOnComplete: options?.removeOnComplete ?? this.aiConfigService.jobRemoveOnComplete,
      removeOnFail: options?.removeOnFail ?? this.aiConfigService.jobRemoveOnFail,
    };

    await this.queue.add(data.type, data, jobOptions);
    
    return jobId;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    
    switch (state) {
      case 'waiting':
      case 'delayed':
        return JobStatus.PENDING;
      case 'active':
        return JobStatus.PROCESSING;
      case 'completed':
        return JobStatus.COMPLETED;
      case 'failed':
        const attemptsMade = job.attemptsMade;
        const maxAttempts = job.opts.attempts || 1;
        if (attemptsMade < maxAttempts) {
          return JobStatus.RETRYING;
        }
        return JobStatus.FAILED;
      default:
        return JobStatus.CANCELLED;
    }
  }

  async getJob(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress();
    
    return {
      id: job.id,
      data: job.data,
      status: await this.getJobStatus(jobId),
      state,
      progress,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      returnValue: job.returnvalue,
      opts: job.opts,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.remove();
    return true;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    
    if (state !== 'failed') {
      throw new Error(`Job ${jobId} is not in failed state`);
    }

    await job.retry();
    return true;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async cleanOldJobs(grace: number): Promise<number> {
    const jobs = await this.queue.clean(grace, 'completed');
    const failedJobs = await this.queue.clean(grace, 'failed');
    
    return jobs.length + failedJobs.length;
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
  }

  /**
   * Helper method to get jobs by status
   */
  async getJobsByStatus(status: JobStatus, limit: number = 100): Promise<Job[]> {
    let jobs: Job[] = [];
    
    switch (status) {
      case JobStatus.PENDING:
        jobs = await this.queue.getWaiting(0, limit - 1);
        break;
      case JobStatus.PROCESSING:
        jobs = await this.queue.getActive(0, limit - 1);
        break;
      case JobStatus.COMPLETED:
        jobs = await this.queue.getCompleted(0, limit - 1);
        break;
      case JobStatus.FAILED:
        jobs = await this.queue.getFailed(0, limit - 1);
        break;
      default:
        jobs = [];
    }
    
    return jobs;
  }

  /**
   * Helper method to clear all jobs
   */
  async clearQueue(): Promise<void> {
    await this.queue.empty();
  }

  /**
   * Helper method to get queue health
   */
  async getQueueHealth(): Promise<{
    isHealthy: boolean;
    isPaused: boolean;
    stats: any;
    redisStatus: string;
  }> {
    const isPaused = await this.queue.isPaused();
    const stats = await this.getQueueStats();
    
    // Check Redis connection
    let redisStatus = 'disconnected';
    try {
      await this.queue.client.ping();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'error';
    }
    
    const isHealthy = redisStatus === 'connected' && !isPaused;
    
    return {
      isHealthy,
      isPaused,
      stats,
      redisStatus,
    };
  }
}