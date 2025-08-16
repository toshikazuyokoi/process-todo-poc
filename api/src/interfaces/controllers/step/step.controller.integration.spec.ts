import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { TestDataFactory } from '../../../../test/factories/test-data.factory';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { MockJwtAuthGuard } from '../../../../test/mocks/auth.mock';

describe('StepController Integration Tests - Assignee Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUserId: number;
  let testCaseId: number;
  let testStepId: number;
  let testAssigneeId: number;
  let testPrefix: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideGuard(JwtAuthGuard)
    .useClass(MockJwtAuthGuard)
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

    // Get unique prefix for this test run
    testPrefix = TestDataFactory.getUniquePrefix();

    // Clean up any existing test data
    await TestDataFactory.cleanupAll(prisma);

    // Create test users using factory
    const owner = await TestDataFactory.createUser(prisma, {
      email: `${testPrefix}owner@example.com`,
      name: `${testPrefix}Owner`,
      role: 'admin',
    });
    testUserId = owner.id;

    const assignee = await TestDataFactory.createUser(prisma, {
      email: `${testPrefix}assignee@example.com`,
      name: `${testPrefix}Assignee`,
      role: 'member',
    });
    testAssigneeId = assignee.id;

    // Create test template using factory
    const template = await TestDataFactory.createTemplate(prisma, {
      name: `${testPrefix}TEMPLATE_ASSIGNEE`,
      stepCount: 1
    });

    // Create test case using factory
    const testCase = await TestDataFactory.createCase(prisma, {
      templateId: template.id,
      userId: testUserId,
      title: `${testPrefix}CASE_ASSIGNEE`
    });
    testCaseId = testCase.id;

    // Create test step instance using factory
    const step = await TestDataFactory.createStep(prisma, {
      caseId: testCaseId,
      templateStepId: template.stepTemplates[0].id,
      name: `${testPrefix}STEP_ASSIGNEE`
    });
    testStepId = step.id;
  });

  afterAll(async () => {
    // Clean up test data using factory
    await TestDataFactory.cleanup(prisma, testPrefix);

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
      // Create another assignee using factory
      const assignee2 = await TestDataFactory.createUser(prisma, {
        email: `${testPrefix}assignee2@example.com`,
        name: `${testPrefix}Assignee 2`,
        role: 'member',
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