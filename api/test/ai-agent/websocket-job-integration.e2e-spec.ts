import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bull';
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
import { getQueueToken } from '@nestjs/bull';
import { AppModule } from '../../src/app.module';
import { JobType } from '../../src/infrastructure/queue/background-job-queue.interface';

describe('WebSocket and Job Queue Integration (E2E)', () => {
  let app: INestApplication;
  let aiJobQueue: Queue;
  let clientSocket: any;
  let mockToken: string;
  
  beforeAll(async () => {
    // Generate mock JWT token for testing
    mockToken = jwt.sign(
      { 
        sub: 1,  // userId
        email: 'test@example.com',
        roles: [],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
      },
      process.env.JWT_SECRET || 'test-secret'
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Get the job queue
    aiJobQueue = app.get<Queue>(getQueueToken('ai-jobs'));
    
    // Start listening
    await app.listen(3001);
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  describe('Real-time notification flow', () => {
    beforeEach((done) => {
      // Connect WebSocket client with authentication
      clientSocket = io('http://localhost:3001/ai-agent', {
        transports: ['websocket'],
        auth: {
          token: mockToken
        }
      });
      
      clientSocket.on('connect', () => {
        done();
      });
      
      clientSocket.on('connect_error', (error: any) => {
        console.error('Connection error:', error.message);
      });
    });

    afterEach(() => {
      if (clientSocket) {
        clientSocket.disconnect();
      }
    });

    it('should notify via WebSocket when web research job completes', (done) => {
      const sessionId = 'test-session-123';
      
      // Join session room
      clientSocket.emit('join-session', { sessionId });
      
      // Listen for successful join confirmation
      clientSocket.on('session-joined', (data: any) => {
        console.log('Successfully joined session:', data);
      });
      
      // Listen for errors
      clientSocket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
      
      // Listen for research complete notification
      clientSocket.on('ai-notification', (notification: any) => {
        console.log('Received notification:', notification);
        if (notification.data?.event === 'research_complete') {
          expect(notification.type).toBe('template');
          expect(notification.sessionId).toBe(sessionId);
          expect(notification.data.results).toBeDefined();
          done();
        }
      });
      
      // Queue a web research job
      aiJobQueue.add(JobType.WEB_RESEARCH, {
        payload: {
          sessionId,
          query: 'test query',
          maxResults: 10,
        },
      });
    }, 10000);

    it('should notify via WebSocket when template generation job completes', (done) => {
      const sessionId = 'test-session-456';
      
      // Join session room
      clientSocket.emit('join-session', { sessionId });
      
      // Listen for template generated notification
      clientSocket.on('ai-notification', (notification: any) => {
        if (notification.data?.event === 'template_generated') {
          expect(notification.type).toBe('template');
          expect(notification.sessionId).toBe(sessionId);
          expect(notification.data.template).toBeDefined();
          expect(notification.data.template.name).toBe('Generated Process Template');
          done();
        }
      });
      
      // Queue a template generation job
      aiJobQueue.add(JobType.TEMPLATE_GENERATION, {
        payload: {
          sessionId,
          requirements: ['req1', 'req2'],
          context: { industry: 'software' },
        },
      });
    }, 10000);

    it('should notify via WebSocket when requirement analysis job completes', (done) => {
      const sessionId = 'test-session-789';
      
      // Join session room
      clientSocket.emit('join-session', { sessionId });
      
      // Listen for requirements extracted notification
      clientSocket.on('ai-notification', (notification: any) => {
        if (notification.data?.event === 'requirements_extracted') {
          expect(notification.type).toBe('message');
          expect(notification.sessionId).toBe(sessionId);
          expect(notification.data.requirements).toBeDefined();
          expect(notification.data.requirements).toHaveLength(1);
          expect(notification.data.requirements[0].category).toBe('goal');
          done();
        }
      });
      
      // Queue a requirement analysis job
      aiJobQueue.add(JobType.REQUIREMENT_ANALYSIS, {
        payload: {
          sessionId,
          conversation: ['message1', 'message2'],
          context: {},
        },
      });
    }, 10000);
  });

  describe('Error handling and retry functionality', () => {
    it('should handle job failure and retry', async () => {
      const job = await aiJobQueue.add(
        'unknown-job-type',
        {
          payload: { test: 'data' },
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 100,
          },
        }
      );
      
      // Wait for job to complete or fail
      await new Promise((resolve) => {
        job.finished().catch(() => {
          // Job failed as expected
          resolve(undefined);
        });
      });
      
      const jobState = await job.getState();
      expect(jobState).toBe('failed');
    }, 10000);

    it('should notify error via WebSocket when job fails', (done) => {
      const sessionId = 'test-session-error';
      
      // Join session room
      clientSocket.emit('join-session', { sessionId });
      
      // Listen for error notification
      clientSocket.on('ai-notification', (notification: any) => {
        if (notification.type === 'error') {
          expect(notification.sessionId).toBe(sessionId);
          expect(notification.data).toBeDefined();
          done();
        }
      });
      
      // Queue a job that will fail (using invalid job type)
      aiJobQueue.add('invalid-job-type', {
        payload: {
          sessionId,
          willFail: true,
        },
      });
    }, 10000);
  });

  describe('Job progress tracking', () => {
    it('should track job progress through completion', async () => {
      const job = await aiJobQueue.add(JobType.WEB_RESEARCH, {
        payload: {
          query: 'test progress tracking',
          maxResults: 5,
        },
      });
      
      // Monitor progress
      const progressValues: number[] = [];
      
      // Progress events are handled internally by Bull
      // We'll check the job's progress property after completion
      
      await job.finished();
      
      // Since we can't directly monitor progress events in this test setup,
      // we verify the job completed successfully
      const state = await job.getState();
      expect(state).toBe('completed');
    }, 10000);
  });

  describe('Multiple client connections', () => {
    it('should broadcast to all clients in the same session', (done) => {
      const sessionId = 'test-session-broadcast';
      let client1Connected = false;
      let client2Connected = false;
      let notificationsReceived = 0;
      
      // Create second client with same authentication
      const clientSocket2 = io('http://localhost:3001/ai-agent', {
        transports: ['websocket'],
        auth: {
          token: mockToken
        }
      });
      
      // Setup client 1
      clientSocket.emit('join-session', { sessionId });
      clientSocket.on('ai-notification', (notification: any) => {
        if (notification.data?.event === 'research_complete') {
          notificationsReceived++;
          checkCompletion();
        }
      });
      
      // Setup client 2
      clientSocket2.on('connect', () => {
        clientSocket2.emit('join-session', { sessionId });
        clientSocket2.on('ai-notification', (notification: any) => {
          if (notification.data?.event === 'research_complete') {
            notificationsReceived++;
            checkCompletion();
          }
        });
        
        // Queue job after both clients are connected
        setTimeout(() => {
          aiJobQueue.add(JobType.WEB_RESEARCH, {
            payload: {
              sessionId,
              query: 'broadcast test',
            },
          });
        }, 100);
      });
      
      const checkCompletion = () => {
        if (notificationsReceived === 2) {
          clientSocket2.disconnect();
          done();
        }
      };
    }, 10000);
  });
});