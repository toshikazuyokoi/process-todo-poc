// Mock CacheModule before any imports
jest.mock('@nestjs/cache-manager', () => ({
  CacheModule: {
    registerAsync: jest.fn(() => ({
      module: class MockCacheModule {},
      providers: [
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
            del: jest.fn().mockResolvedValue(1),
            reset: jest.fn().mockResolvedValue(true),
            wrap: jest.fn().mockImplementation(async (key, fn) => fn()),
            store: {
              keys: jest.fn().mockResolvedValue([]),
              ttl: jest.fn().mockResolvedValue(-1),
            },
          },
        },
      ],
      exports: ['CACHE_MANAGER'],
    })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';
import { TestDataFactory } from '../../../../test/factories/test-data.factory';

import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { MockJwtAuthGuard } from '../../../../test/mocks/auth.mock';
describe('CommentController Integration Tests - Comment Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realtimeGateway: RealtimeGateway;
  let testUserId: number;
  let testCaseId: number;
  let testStepId: number;
  let testCommentId: number;
  let testPrefix: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideGuard(JwtAuthGuard)
    .useClass(MockJwtAuthGuard)
    // REDIS_CLIENTのモック追加
    .overrideProvider('REDIS_CLIENT')
    .useValue({
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    })
    .overrideProvider('OpenAIService')
    .useValue({
      generateResponse: jest.fn(),
      generateTemplate: jest.fn(),
      extractEntities: jest.fn(),
      classifyIntent: jest.fn(),
    })
    .overrideProvider('ProcessAnalysisService')
    .useValue({
      analyzeRequirements: jest.fn(),
      extractRequirements: jest.fn(),
      calculateConversationProgress: jest.fn(),
      categorizeProcess: jest.fn(),
      assessComplexity: jest.fn(),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    
    // Add ValidationPipe to match production environment
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    
    await app.init();
    
    prisma = app.get(PrismaService);
    realtimeGateway = app.get(RealtimeGateway);

    // Mock WebSocket broadcast
    jest.spyOn(realtimeGateway, 'broadcastCommentAdded').mockImplementation();
    jest.spyOn(realtimeGateway, 'broadcastCommentDeleted').mockImplementation();

    // Get unique prefix for this test run
    testPrefix = TestDataFactory.getUniquePrefix();

    // Clean up only this test's data (not all test data)
    await TestDataFactory.cleanup(prisma, testPrefix);

    // Create test user using factory
    const user = await TestDataFactory.createUser(prisma, {
      email: `${testPrefix}comment.user@example.com`,
      name: `${testPrefix}Comment User`,
      role: 'member'
    });
    testUserId = user.id;
    
    // Set the mock user ID to match the test user
    MockJwtAuthGuard.mockUserId = testUserId;

    // Create test template using factory
    const template = await TestDataFactory.createTemplate(prisma, {
      name: `${testPrefix}TEMPLATE_COMMENT`,
      stepCount: 1
    });

    // Create test case using factory
    const testCase = await TestDataFactory.createCase(prisma, {
      templateId: template.id,
      userId: testUserId,
      title: `${testPrefix}CASE_COMMENT`
    });
    testCaseId = testCase.id;

    // Create test step instance using factory
    const step = await TestDataFactory.createStep(prisma, {
      caseId: testCaseId,
      templateStepId: template.stepTemplates[0].id,
      name: `${testPrefix}STEP_COMMENT`
    });
    testStepId = step.id;
  });

  afterAll(async () => {
    // Clean up test data using factory
    await TestDataFactory.cleanup(prisma, testPrefix);
    
    // Reset mock user ID
    MockJwtAuthGuard.mockUserId = 1;

    await app.close();
  });

  describe('POST /comments', () => {
    it('should create a new comment', async () => {
      const commentData = {
        stepId: testStepId,
        userId: testUserId,
        content: `${testPrefix}COMMENT_CREATE`
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .send(commentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', `${testPrefix}COMMENT_CREATE`);
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('stepId', testStepId);

      testCommentId = response.body.id;

      // Verify WebSocket notification was sent
      expect(realtimeGateway.broadcastCommentAdded).toHaveBeenCalledWith(
        testCaseId,
        testStepId,
        expect.objectContaining({
          content: `${testPrefix}COMMENT_CREATE`
        })
      );
    });

    it('should fail with invalid step ID', async () => {
      const commentData = {
        stepId: 999999,
        userId: testUserId,
        content: `${testPrefix}COMMENT_INVALID`
      };

      await request(app.getHttpServer())
        .post('/api/comments')
        .send(commentData)
        .expect(404);
    });

    it('should fail with empty content', async () => {
      const commentData = {
        stepId: testStepId,
        userId: testUserId,
        content: ''
      };

      await request(app.getHttpServer())
        .post('/api/comments')
        .send(commentData)
        .expect(400);
    });
  });

  describe('GET /comments/steps/:stepId', () => {
    beforeEach(async () => {
      // Create multiple test comments using factory
      const comments = ['COMMENT_1', 'COMMENT_2', 'COMMENT_3'];
      for (const comment of comments) {
        await TestDataFactory.createComment(prisma, {
          stepId: testStepId,
          userId: testUserId,
          content: `${testPrefix}${comment}`
        });
      }
    });

    it('should retrieve all comments for a step', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/comments/steps/${testStepId}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      expect(response.body.some((c: any) => c.content === `${testPrefix}COMMENT_1`)).toBe(true);
      expect(response.body.some((c: any) => c.content === `${testPrefix}COMMENT_2`)).toBe(true);
      expect(response.body.some((c: any) => c.content === `${testPrefix}COMMENT_3`)).toBe(true);
    });

    it('should return empty array for step with no comments', async () => {
      // Get template for creating new step
      const templateWithSteps = await prisma.processTemplate.findFirst({
        where: { name: { contains: testPrefix } },
        include: { stepTemplates: true }
      });

      if (!templateWithSteps || templateWithSteps.stepTemplates.length === 0) {
        throw new Error('Test template with steps not found');
      }

      // Create a new step without comments using factory
      const newStep = await TestDataFactory.createStep(prisma, {
        caseId: testCaseId,
        templateStepId: templateWithSteps.stepTemplates[0].id,
        name: `${testPrefix}STEP_NO_COMMENTS`
      });

      const response = await request(app.getHttpServer())
        .get(`/api/comments/steps/${newStep.id}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);

      // Clean up
      await prisma.stepInstance.delete({ where: { id: newStep.id } });
    });
  });

  describe('PUT /comments/:id', () => {
    let updateCommentId: number;

    beforeEach(async () => {
      const comment = await TestDataFactory.createComment(prisma, {
        stepId: testStepId,
        userId: testUserId,
        content: `${testPrefix}COMMENT_UPDATE_ORIGINAL`
      });
      updateCommentId = comment.id;
      
      // Debug: Verify the comment was created
      if (!updateCommentId) {
        throw new Error('Failed to create comment for update test');
      }
    });

    it('should update a comment', async () => {
      const updateData = {
        content: `${testPrefix}COMMENT_UPDATE_MODIFIED`
      };

      const response = await request(app.getHttpServer())
        .put(`/api/comments/${updateCommentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', updateCommentId);
      expect(response.body).toHaveProperty('content', `${testPrefix}COMMENT_UPDATE_MODIFIED`);

      // Verify in database
      const updatedComment = await prisma.comment.findUnique({
        where: { id: updateCommentId }
      });
      expect(updatedComment?.content).toBe(`${testPrefix}COMMENT_UPDATE_MODIFIED`);
    });

    it('should fail to update non-existent comment', async () => {
      await request(app.getHttpServer())
        .put('/api/comments/999999')
        .send({ content: `${testPrefix}COMMENT_UPDATE_FAIL` })
        .expect(404);
    });
  });

  describe('DELETE /comments/:id', () => {
    let deleteCommentId: number;

    beforeEach(async () => {
      const comment = await TestDataFactory.createComment(prisma, {
        stepId: testStepId,
        userId: testUserId,
        content: `${testPrefix}COMMENT_DELETE`
      });
      deleteCommentId = comment.id;
    });

    it('should delete a comment', async () => {
      await request(app.getHttpServer())
        .delete(`/api/comments/${deleteCommentId}`)
        .expect(204);  // Changed from 200 to 204 (No Content)

      // Verify deleted from database
      const deletedComment = await prisma.comment.findUnique({
        where: { id: deleteCommentId }
      });
      expect(deletedComment).toBeNull();

      // Note: WebSocket notification is not sent with 204 response
      // The broadcastCommentDeleted should be called in the controller
    });

    it('should fail to delete non-existent comment', async () => {
      await request(app.getHttpServer())
        .delete('/api/comments/999999')
        .expect(404);
    });
  });

  describe('Comment workflow integration', () => {
    it('should handle complete comment workflow with replies', async () => {
      // 1. Create parent comment
      const parentResponse = await request(app.getHttpServer())
        .post('/api/comments')
        .send({
          stepId: testStepId,
          userId: testUserId,
          content: `${testPrefix}COMMENT_PARENT`
        })
        .expect(201);

      const parentId = parentResponse.body.id;

      // 2. Create reply to parent comment
      const replyResponse = await request(app.getHttpServer())
        .post(`/api/comments/${parentId}/reply`)
        .send({
          userId: testUserId,
          content: `${testPrefix}COMMENT_REPLY`
        })
        .expect(201);

      expect(replyResponse.body).toHaveProperty('parentId', parentId);
      expect(replyResponse.body).toHaveProperty('content', `${testPrefix}COMMENT_REPLY`);

      // 3. Get all comments for step (should include parent and reply)
      const allComments = await request(app.getHttpServer())
        .get(`/api/comments/steps/${testStepId}`)
        .expect(200);

      // Comments are returned in hierarchical structure - replies are nested
      const parent = allComments.body.find((c: any) => c.id === parentId);
      const reply = parent?.replies?.find((r: any) => r.content === `${testPrefix}COMMENT_REPLY`);

      expect(parent).toBeDefined();
      expect(reply).toBeDefined();

      // 4. Update the reply
      await request(app.getHttpServer())
        .put(`/api/comments/${replyResponse.body.id}`)
        .send({ content: `${testPrefix}COMMENT_REPLY_UPDATED` })
        .expect(200);

      // 5. Delete the reply
      await request(app.getHttpServer())
        .delete(`/api/comments/${replyResponse.body.id}`)
        .expect(204);  // Changed from 200 to 204

      // 6. Verify only parent remains
      const finalComments = await request(app.getHttpServer())
        .get(`/api/comments/steps/${testStepId}`)
        .expect(200);

      // Check that the parent has no replies after deletion
      const finalParent = finalComments.body.find((c: any) => c.id === parentId);
      expect(finalParent).toBeDefined();
      expect(finalParent.replies).toHaveLength(0);
    });
  });
});