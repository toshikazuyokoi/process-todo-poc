import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';

describe('CommentController Integration Tests - Comment Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realtimeGateway: RealtimeGateway;
  let testUserId: number;
  let testCaseId: number;
  let testStepId: number;
  let testCommentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);
    realtimeGateway = app.get(RealtimeGateway);

    // Mock WebSocket broadcast
    jest.spyOn(realtimeGateway, 'broadcastCommentAdded').mockImplementation();
    jest.spyOn(realtimeGateway, 'broadcastCommentDeleted').mockImplementation();

    // Clean up test data
    await prisma.comment.deleteMany({
      where: { content: { startsWith: 'TEST_COMMENT_' } }
    });
    await prisma.stepInstance.deleteMany({
      where: { name: { startsWith: 'TEST_STEP_' } }
    });
    await prisma.case.deleteMany({
      where: { title: { startsWith: 'TEST_CASE_' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test.comment.' } }
    });
    await prisma.processTemplate.deleteMany({
      where: { name: { startsWith: 'TEST_TEMPLATE_' } }
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test.comment.user@example.com',
        name: 'Test Comment User',
        password: 'hashed_password',
        role: 'member',
      }
    });
    testUserId = user.id;

    // Create test template
    const template = await prisma.processTemplate.create({
      data: {
        name: 'TEST_TEMPLATE_COMMENT',
        isActive: true,
        stepTemplates: {
          create: [
            {
              seq: 1,
              name: 'Step 1',
              basis: 'goal',
              offsetDays: -10,
              requiredArtifactsJson: []
            }
          ]
        }
      },
      include: { stepTemplates: true }
    });

    // Create test case
    const testCase = await prisma.case.create({
      data: {
        processId: template.id,
        title: 'TEST_CASE_COMMENT',
        goalDateUtc: new Date('2025-12-31'),
        status: 'open',
        createdBy: testUserId,
      }
    });
    testCaseId = testCase.id;

    // Get the template with step templates
    const templateWithSteps = await prisma.processTemplate.findUnique({
      where: { id: template.id },
      include: { stepTemplates: true }
    });

    // Create test step instance
    const step = await prisma.stepInstance.create({
      data: {
        caseId: testCaseId,
        templateId: templateWithSteps!.stepTemplates[0].id,
        name: 'TEST_STEP_COMMENT',
        dueDateUtc: new Date('2025-12-21'),
        status: 'todo',
        locked: false,
      }
    });
    testStepId = step.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.comment.deleteMany({
      where: { stepId: testStepId }
    });
    await prisma.stepInstance.deleteMany({
      where: { id: testStepId }
    });
    await prisma.case.deleteMany({
      where: { id: testCaseId }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test.comment.' } }
    });
    await prisma.processTemplate.deleteMany({
      where: { name: { startsWith: 'TEST_TEMPLATE_' } }
    });

    await app.close();
  });

  describe('POST /comments', () => {
    it('should create a new comment', async () => {
      const commentData = {
        stepId: testStepId,
        userId: testUserId,
        content: 'TEST_COMMENT_CREATE'
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .send(commentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', 'TEST_COMMENT_CREATE');
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('stepId', testStepId);

      testCommentId = response.body.id;

      // Verify WebSocket notification was sent
      expect(realtimeGateway.broadcastCommentAdded).toHaveBeenCalledWith(
        testCaseId,
        testStepId,
        expect.objectContaining({
          content: 'TEST_COMMENT_CREATE'
        })
      );
    });

    it('should fail with invalid step ID', async () => {
      const commentData = {
        stepId: 999999,
        userId: testUserId,
        content: 'TEST_COMMENT_INVALID'
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
      // Create multiple test comments
      await prisma.comment.createMany({
        data: [
          {
            stepId: testStepId,
            userId: testUserId,
            content: 'TEST_COMMENT_1',
          },
          {
            stepId: testStepId,
            userId: testUserId,
            content: 'TEST_COMMENT_2',
          },
          {
            stepId: testStepId,
            userId: testUserId,
            content: 'TEST_COMMENT_3',
          }
        ]
      });
    });

    it('should retrieve all comments for a step', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/comments/steps/${testStepId}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      expect(response.body.some((c: any) => c.content === 'TEST_COMMENT_1')).toBe(true);
      expect(response.body.some((c: any) => c.content === 'TEST_COMMENT_2')).toBe(true);
      expect(response.body.some((c: any) => c.content === 'TEST_COMMENT_3')).toBe(true);
    });

    it('should return empty array for step with no comments', async () => {
      // Create a new step without comments
      const newStep = await prisma.stepInstance.create({
        data: {
          caseId: testCaseId,
          templateId: 1,
          name: 'TEST_STEP_NO_COMMENTS',
          dueDateUtc: new Date('2025-12-21'),
          status: 'todo',
          locked: false,
        }
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
      const comment = await prisma.comment.create({
        data: {
          stepId: testStepId,
          userId: testUserId,
          content: 'TEST_COMMENT_UPDATE_ORIGINAL',
        }
      });
      updateCommentId = comment.id;
    });

    it('should update a comment', async () => {
      const updateData = {
        content: 'TEST_COMMENT_UPDATE_MODIFIED'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/comments/${updateCommentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', updateCommentId);
      expect(response.body).toHaveProperty('content', 'TEST_COMMENT_UPDATE_MODIFIED');

      // Verify in database
      const updatedComment = await prisma.comment.findUnique({
        where: { id: updateCommentId }
      });
      expect(updatedComment?.content).toBe('TEST_COMMENT_UPDATE_MODIFIED');
    });

    it('should fail to update non-existent comment', async () => {
      await request(app.getHttpServer())
        .put('/api/comments/999999')
        .send({ content: 'TEST_COMMENT_UPDATE_FAIL' })
        .expect(404);
    });
  });

  describe('DELETE /comments/:id', () => {
    let deleteCommentId: number;

    beforeEach(async () => {
      const comment = await prisma.comment.create({
        data: {
          stepId: testStepId,
          userId: testUserId,
          content: 'TEST_COMMENT_DELETE',
        }
      });
      deleteCommentId = comment.id;
    });

    it('should delete a comment', async () => {
      await request(app.getHttpServer())
        .delete(`/api/comments/${deleteCommentId}`)
        .expect(200);

      // Verify deleted from database
      const deletedComment = await prisma.comment.findUnique({
        where: { id: deleteCommentId }
      });
      expect(deletedComment).toBeNull();

      // Verify WebSocket notification was sent
      expect(realtimeGateway.broadcastCommentDeleted).toHaveBeenCalledWith(
        testCaseId,
        testStepId,
        deleteCommentId
      );
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
          content: 'TEST_COMMENT_PARENT'
        })
        .expect(201);

      const parentId = parentResponse.body.id;

      // 2. Create reply to parent comment
      const replyResponse = await request(app.getHttpServer())
        .post(`/api/comments/${parentId}/reply`)
        .send({
          userId: testUserId,
          content: 'TEST_COMMENT_REPLY'
        })
        .expect(201);

      expect(replyResponse.body).toHaveProperty('parentId', parentId);
      expect(replyResponse.body).toHaveProperty('content', 'TEST_COMMENT_REPLY');

      // 3. Get all comments for step (should include parent and reply)
      const allComments = await request(app.getHttpServer())
        .get(`/api/comments/steps/${testStepId}`)
        .expect(200);

      const parent = allComments.body.find((c: any) => c.id === parentId);
      const reply = allComments.body.find((c: any) => c.parentId === parentId);

      expect(parent).toBeDefined();
      expect(reply).toBeDefined();

      // 4. Update the reply
      await request(app.getHttpServer())
        .put(`/api/comments/${replyResponse.body.id}`)
        .send({ content: 'TEST_COMMENT_REPLY_UPDATED' })
        .expect(200);

      // 5. Delete the reply
      await request(app.getHttpServer())
        .delete(`/api/comments/${replyResponse.body.id}`)
        .expect(200);

      // 6. Verify only parent remains
      const finalComments = await request(app.getHttpServer())
        .get(`/api/comments/steps/${testStepId}`)
        .expect(200);

      const remainingReply = finalComments.body.find((c: any) => c.parentId === parentId);
      expect(remainingReply).toBeUndefined();
    });
  });
});