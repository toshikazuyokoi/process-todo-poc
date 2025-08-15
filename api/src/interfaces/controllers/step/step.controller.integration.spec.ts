import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

describe('StepController Integration Tests - Assignee Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUserId: number;
  let testCaseId: number;
  let testStepId: number;
  let testAssigneeId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);

    // Clean up test data
    await prisma.stepInstance.deleteMany({
      where: { name: { startsWith: 'TEST_STEP_' } }
    });
    await prisma.case.deleteMany({
      where: { title: { startsWith: 'TEST_CASE_' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test.assignee.' } }
    });
    await prisma.processTemplate.deleteMany({
      where: { name: { startsWith: 'TEST_TEMPLATE_' } }
    });

    // Create test users
    const owner = await prisma.user.create({
      data: {
        email: 'test.owner@example.com',
        name: 'Test Owner',
        password: 'hashed_password',
        role: 'admin',
      }
    });
    testUserId = owner.id;

    const assignee = await prisma.user.create({
      data: {
        email: 'test.assignee.1@example.com',
        name: 'Test Assignee 1',
        password: 'hashed_password',
        role: 'member',
      }
    });
    testAssigneeId = assignee.id;

    // Create test template
    const template = await prisma.processTemplate.create({
      data: {
        name: 'TEST_TEMPLATE_ASSIGNEE',
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
        title: 'TEST_CASE_ASSIGNEE',
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
        name: 'TEST_STEP_ASSIGNEE',
        dueDateUtc: new Date('2025-12-21'),
        status: 'todo',
        locked: false,
      }
    });
    testStepId = step.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.stepInstance.deleteMany({
      where: { id: testStepId }
    });
    await prisma.case.deleteMany({
      where: { id: testCaseId }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test.' } }
    });
    await prisma.processTemplate.deleteMany({
      where: { name: { startsWith: 'TEST_TEMPLATE_' } }
    });

    await app.close();
  });

  describe('PUT /steps/:id/assignee', () => {
    it('should assign a user to a step', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: testAssigneeId })
        .expect(200);

      expect(response.body).toHaveProperty('id', testStepId);
      expect(response.body).toHaveProperty('assigneeId', testAssigneeId);

      // Verify in database
      const updatedStep = await prisma.stepInstance.findUnique({
        where: { id: testStepId }
      });
      expect(updatedStep?.assigneeId).toBe(testAssigneeId);
    });

    it('should unassign a user from a step', async () => {
      // First assign
      await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: testAssigneeId })
        .expect(200);

      // Then unassign
      const response = await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: null })
        .expect(200);

      expect(response.body).toHaveProperty('id', testStepId);
      expect(response.body.assigneeId).toBeNull();

      // Verify in database
      const updatedStep = await prisma.stepInstance.findUnique({
        where: { id: testStepId }
      });
      expect(updatedStep?.assigneeId).toBeNull();
    });

    it('should fail with invalid step ID', async () => {
      await request(app.getHttpServer())
        .put('/api/steps/999999/assignee')
        .send({ assigneeId: testAssigneeId })
        .expect(404);
    });

    it('should fail with invalid assignee ID', async () => {
      await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: 999999 })
        .expect(404);
    });

    it('should fail when step is locked', async () => {
      // Lock the step
      await prisma.stepInstance.update({
        where: { id: testStepId },
        data: { locked: true }
      });

      await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: testAssigneeId })
        .expect(400);

      // Unlock for other tests
      await prisma.stepInstance.update({
        where: { id: testStepId },
        data: { locked: false }
      });
    });
  });

  describe('Assignee workflow integration', () => {
    it('should handle complete assignee workflow', async () => {
      // 1. Get initial step state
      const initialStep = await prisma.stepInstance.findUnique({
        where: { id: testStepId }
      });
      expect(initialStep?.assigneeId).toBeNull();

      // 2. Assign user
      await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: testAssigneeId })
        .expect(200);

      // 3. Update status to in_progress
      await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      // 4. Verify step is locked and assigned
      const progressStep = await prisma.stepInstance.findUnique({
        where: { id: testStepId }
      });
      expect(progressStep?.assigneeId).toBe(testAssigneeId);
      expect(progressStep?.status).toBe('in_progress');

      // 5. Complete the step
      await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/status`)
        .send({ status: 'done' })
        .expect(200);

      // 6. Verify final state
      const completedStep = await prisma.stepInstance.findUnique({
        where: { id: testStepId }
      });
      expect(completedStep?.status).toBe('done');
      expect(completedStep?.assigneeId).toBe(testAssigneeId);
    });

    it('should support reassignment', async () => {
      // Create another assignee
      const assignee2 = await prisma.user.create({
        data: {
          email: 'test.assignee.2@example.com',
          name: 'Test Assignee 2',
          password: 'hashed_password',
          role: 'member',
        }
      });

      // Reset step status
      await prisma.stepInstance.update({
        where: { id: testStepId },
        data: { status: 'todo', assigneeId: testAssigneeId }
      });

      // Reassign to different user
      const response = await request(app.getHttpServer())
        .put(`/api/steps/${testStepId}/assignee`)
        .send({ assigneeId: assignee2.id })
        .expect(200);

      expect(response.body.assigneeId).toBe(assignee2.id);

      // Clean up
      await prisma.user.delete({
        where: { id: assignee2.id }
      });
    });
  });
});