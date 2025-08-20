import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { BullJobQueueService } from './bull-job-queue.service';
import { AIConfigService } from '../../config/ai-config.service';
import { JobType, JobStatus } from './background-job-queue.interface';

// Mock Bull Queue
const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
  getWaitingCount: jest.fn(),
  getActiveCount: jest.fn(),
  getCompletedCount: jest.fn(),
  getFailedCount: jest.fn(),
  getDelayedCount: jest.fn(),
  clean: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  isPaused: jest.fn(),
  empty: jest.fn(),
  close: jest.fn(),
  client: {
    ping: jest.fn(),
  },
  getWaiting: jest.fn(),
  getActive: jest.fn(),
  getCompleted: jest.fn(),
  getFailed: jest.fn(),
};

// Mock Job
const createMockJob = (id: string, state: string, data: any = {}) => ({
  id,
  data,
  opts: { attempts: 3 },
  timestamp: Date.now(),
  processedOn: null,
  finishedOn: null,
  attemptsMade: 0,
  failedReason: null,
  returnvalue: null,
  getState: jest.fn().mockResolvedValue(state),
  progress: jest.fn().mockReturnValue(0),
  remove: jest.fn().mockResolvedValue(true),
  retry: jest.fn().mockResolvedValue(true),
});

describe('BullJobQueueService', () => {
  let service: BullJobQueueService;
  let aiConfigService: AIConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullJobQueueService,
        {
          provide: getQueueToken('ai-jobs'),
          useValue: mockQueue,
        },
        {
          provide: AIConfigService,
          useValue: {
            jobDefaultRetries: 3,
            jobDefaultBackoffDelay: 5000,
            jobRemoveOnComplete: 100,
            jobRemoveOnFail: 50,
          },
        },
      ],
    }).compile();

    service = module.get<BullJobQueueService>(BullJobQueueService);
    aiConfigService = module.get<AIConfigService>(AIConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      const jobData = {
        sessionId: 'session-123',
        userId: 1,
        type: JobType.WEB_RESEARCH,
        payload: { query: 'test query' },
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const jobId = await service.addJob(jobData);

      expect(jobId).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalledWith(
        JobType.WEB_RESEARCH,
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }),
      );
    });

    it('should use custom options when provided', async () => {
      const jobData = {
        userId: 1,
        type: JobType.TEMPLATE_GENERATION,
        payload: {},
      };

      const options = {
        priority: 10,
        delay: 1000,
        attempts: 5,
      };

      await service.addJob(jobData, options);

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobType.TEMPLATE_GENERATION,
        jobData,
        expect.objectContaining({
          priority: 10,
          delay: 1000,
          attempts: 5,
        }),
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return PENDING for waiting job', async () => {
      const mockJob = createMockJob('job-123', 'waiting');
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-123');

      expect(status).toBe(JobStatus.PENDING);
    });

    it('should return PROCESSING for active job', async () => {
      const mockJob = createMockJob('job-123', 'active');
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-123');

      expect(status).toBe(JobStatus.PROCESSING);
    });

    it('should return COMPLETED for completed job', async () => {
      const mockJob = createMockJob('job-123', 'completed');
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-123');

      expect(status).toBe(JobStatus.COMPLETED);
    });

    it('should return FAILED for failed job with no retries left', async () => {
      const mockJob = createMockJob('job-123', 'failed');
      mockJob.attemptsMade = 3;
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-123');

      expect(status).toBe(JobStatus.FAILED);
    });

    it('should return RETRYING for failed job with retries remaining', async () => {
      const mockJob = createMockJob('job-123', 'failed');
      mockJob.attemptsMade = 1;
      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getJobStatus('job-123');

      expect(status).toBe(JobStatus.RETRYING);
    });

    it('should throw error if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getJobStatus('non-existent')).rejects.toThrow(
        'Job non-existent not found',
      );
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job', async () => {
      const mockJob = createMockJob('job-123', 'waiting');
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.cancelJob('job-123');

      expect(result).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should throw error if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.cancelJob('non-existent')).rejects.toThrow(
        'Job non-existent not found',
      );
    });
  });

  describe('retryJob', () => {
    it('should retry a failed job', async () => {
      const mockJob = createMockJob('job-123', 'failed');
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.retryJob('job-123');

      expect(result).toBe(true);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should throw error if job is not in failed state', async () => {
      const mockJob = createMockJob('job-123', 'completed');
      mockQueue.getJob.mockResolvedValue(mockJob);

      await expect(service.retryJob('job-123')).rejects.toThrow(
        'Job job-123 is not in failed state',
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(10);
      mockQueue.getFailedCount.mockResolvedValue(1);
      mockQueue.getDelayedCount.mockResolvedValue(3);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 3,
      });
    });
  });

  describe('cleanOldJobs', () => {
    it('should clean old completed and failed jobs', async () => {
      mockQueue.clean.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);
      mockQueue.clean.mockResolvedValueOnce([{ id: '3' }]);

      const count = await service.cleanOldJobs(86400000);

      expect(count).toBe(3);
      expect(mockQueue.clean).toHaveBeenCalledWith(86400000, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(86400000, 'failed');
    });
  });

  describe('pauseQueue and resumeQueue', () => {
    it('should pause the queue', async () => {
      await service.pauseQueue();
      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should resume the queue', async () => {
      await service.resumeQueue();
      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('getQueueHealth', () => {
    it('should return healthy status when Redis is connected and queue not paused', async () => {
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.client.ping.mockResolvedValue('PONG');
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const health = await service.getQueueHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.isPaused).toBe(false);
      expect(health.redisStatus).toBe('connected');
    });

    it('should return unhealthy status when Redis is disconnected', async () => {
      mockQueue.isPaused.mockResolvedValue(false);
      mockQueue.client.ping.mockRejectedValue(new Error('Connection failed'));
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const health = await service.getQueueHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.redisStatus).toBe('error');
    });
  });
});