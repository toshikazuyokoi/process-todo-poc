import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '@infrastructure/gateways/realtime.gateway';

describe('KanbanController Integration Tests - Kanban Operations', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realtimeGateway: RealtimeGateway;
  let testUserId: number;
  let testAssigneeId: number;
  let testCaseId: number;
  let testStepIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);
    realtimeGateway = app.get(RealtimeGateway);

    // Mock WebSocket broadcast
    jest.spyOn(realtimeGateway, 'broadcastStepUpdate').mockImplementation();

    // Clean up test data
    await prisma.stepInstance.deleteMany({
      where: { name: { startsWith: 'TEST_KANBAN_STEP_' } }
    });
    await prisma.case.deleteMany({
      where: { title: { startsWith: 'TEST_KANBAN_CASE_' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test.kanban.' } }
    });
    await prisma.processTemplate.deleteMany({
      where: { name: { startsWith: 'TEST_KANBAN_TEMPLATE_' } }
    });

    // Create test users
    const owner = await prisma.user.create({
      data: {
        email: 'test.kanban.owner@example.com',
        name: 'Test Kanban Owner',
        password: 'hashed_password',
        role: 'admin',
      }
    });
    testUserId = owner.id;

    const assignee = await prisma.user.create({
      data: {
        email: 'test.kanban.assignee@example.com',
        name: 'Test Kanban Assignee',
        password: 'hashed_password',
        role: 'member',
      }
    });
    testAssigneeId = assignee.id;

    // Create test template with multiple steps
    const template = await prisma.processTemplate.create({
      data: {
        name: 'TEST_KANBAN_TEMPLATE',
        isActive: true,
        stepTemplates: {
          create: [
            {
              seq: 1,
              name: 'Step 1',
              basis: 'goal',
              offsetDays: -30,
              requiredArtifactsJson: []
            },
            {
              seq: 2,
              name: 'Step 2',
              basis: 'prev',
              offsetDays: 5,
              requiredArtifactsJson: []
            },
            {
              seq: 3,
              name: 'Step 3',
              basis: 'prev',
              offsetDays: 3,
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
        title: 'TEST_KANBAN_CASE',
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

    // Create test step instances with different statuses
    const stepStatuses = ['todo', 'in_progress', 'done', 'blocked', 'todo'];
    for (let i = 0; i < 5; i++) {
      const step = await prisma.stepInstance.create({
        data: {
          caseId: testCaseId,
          templateId: templateWithSteps!.stepTemplates[i % 3].id,
          name: `TEST_KANBAN_STEP_${i + 1}`,
          dueDateUtc: new Date(`2025-12-${20 + i}`),
          status: stepStatuses[i],
          locked: false,
          assigneeId: i % 2 === 0 ? testAssigneeId : null,
        }
      });
      testStepIds.push(step.id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.stepInstance.deleteMany({
      where: { id: { in: testStepIds } }
    });
    await prisma.case.deleteMany({
      where: { id: testCaseId }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test.kanban.' } }
    });
    await prisma.processTemplate.deleteMany({
      where: { name: { startsWith: 'TEST_KANBAN_TEMPLATE' } }
    });

    await app.close();
  });

  describe('GET /kanban/board', () => {
    it('should retrieve kanban board with all columns', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      expect(response.body).toHaveProperty('columns');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('stats');

      // Check columns structure
      expect(response.body.columns).toBeInstanceOf(Array);
      expect(response.body.columns).toHaveLength(5); // todo, in_progress, review, done, blocked

      const todoColumn = response.body.columns.find((c: any) => c.id === 'todo');
      expect(todoColumn).toBeDefined();
      expect(todoColumn.items).toBeInstanceOf(Array);
    });

    it('should filter by assignee', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/kanban/board?assigneeId=${testAssigneeId}`)
        .expect(200);

      // Check that all items in all columns have the correct assignee
      for (const column of response.body.columns) {
        for (const item of column.items) {
          if (item.assigneeId !== null) {
            expect(item.assigneeId).toBe(testAssigneeId);
          }
        }
      }
    });

    it('should filter by case', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/kanban/board?caseId=${testCaseId}`)
        .expect(200);

      // Check that all items belong to the correct case
      for (const column of response.body.columns) {
        for (const item of column.items) {
          expect(item.caseId).toBe(testCaseId);
        }
      }
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board?status=todo&status=done')
        .expect(200);

      // Check that only todo and done items are returned
      const allItems: any[] = [];
      for (const column of response.body.columns) {
        allItems.push(...column.items);
      }

      for (const item of allItems) {
        expect(['todo', 'done']).toContain(item.status);
      }
    });

    it('should include user list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      expect(response.body.users).toBeInstanceOf(Array);
      const testUser = response.body.users.find((u: any) => u.id === testAssigneeId);
      expect(testUser).toBeDefined();
      expect(testUser).toHaveProperty('name', 'Test Kanban Assignee');
    });

    it('should calculate correct statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      const { stats } = response.body;
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('todo');
      expect(stats).toHaveProperty('inProgress');
      expect(stats).toHaveProperty('done');
      expect(stats).toHaveProperty('blocked');

      // Verify stats match actual items
      const todoCount = response.body.columns.find((c: any) => c.id === 'todo').items.length;
      const doneCount = response.body.columns.find((c: any) => c.id === 'done').items.length;
      
      expect(stats.todo).toBe(todoCount);
      expect(stats.done).toBe(doneCount);
    });
  });

  describe('Kanban drag-and-drop workflow', () => {
    it('should handle complete drag-and-drop workflow', async () => {
      const todoStepId = testStepIds[0];

      // 1. Get initial kanban state
      const initialBoard = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      const initialTodoItems = initialBoard.body.columns.find((c: any) => c.id === 'todo').items;
      const initialInProgressItems = initialBoard.body.columns.find((c: any) => c.id === 'in_progress').items;

      // 2. Move item from todo to in_progress
      await request(app.getHttpServer())
        .put(`/api/steps/${todoStepId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      // Verify WebSocket notification
      expect(realtimeGateway.broadcastStepUpdate).toHaveBeenCalledWith(
        testCaseId,
        expect.objectContaining({
          id: todoStepId,
          status: 'in_progress'
        })
      );

      // 3. Get updated kanban state
      const updatedBoard = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      const updatedTodoItems = updatedBoard.body.columns.find((c: any) => c.id === 'todo').items;
      const updatedInProgressItems = updatedBoard.body.columns.find((c: any) => c.id === 'in_progress').items;

      // 4. Verify item moved between columns
      expect(updatedTodoItems.find((item: any) => item.id === todoStepId)).toBeUndefined();
      expect(updatedInProgressItems.find((item: any) => item.id === todoStepId)).toBeDefined();

      // 5. Move to done
      await request(app.getHttpServer())
        .put(`/api/steps/${todoStepId}/status`)
        .send({ status: 'done' })
        .expect(200);

      // 6. Verify final state
      const finalBoard = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      const finalDoneItems = finalBoard.body.columns.find((c: any) => c.id === 'done').items;
      expect(finalDoneItems.find((item: any) => item.id === todoStepId)).toBeDefined();
    });

    it('should enforce WIP limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      // Check that columns have WIP limits defined
      const inProgressColumn = response.body.columns.find((c: any) => c.id === 'in_progress');
      expect(inProgressColumn).toHaveProperty('wipLimit');
      expect(inProgressColumn.wipLimit).toBeGreaterThan(0);
    });

    it('should handle blocked status correctly', async () => {
      const stepId = testStepIds[2];

      // Move step to blocked
      await request(app.getHttpServer())
        .put(`/api/steps/${stepId}/status`)
        .send({ status: 'blocked' })
        .expect(200);

      // Get kanban board
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      // Verify step is in blocked column
      const blockedColumn = response.body.columns.find((c: any) => c.id === 'blocked');
      const blockedItem = blockedColumn.items.find((item: any) => item.id === stepId);
      expect(blockedItem).toBeDefined();
      expect(blockedItem.status).toBe('blocked');
    });
  });

  describe('Kanban with multiple users', () => {
    it('should show assignee names correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanban/board')
        .expect(200);

      // Find items with assignees
      const itemsWithAssignees: any[] = [];
      for (const column of response.body.columns) {
        itemsWithAssignees.push(...column.items.filter((item: any) => item.assigneeId));
      }

      // Check that assignee names are included
      for (const item of itemsWithAssignees) {
        if (item.assigneeId === testAssigneeId) {
          expect(item.assigneeName).toBe('Test Kanban Assignee');
        }
      }
    });

    it('should support filtering by multiple assignees', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: 'test.kanban.another@example.com',
          name: 'Another User',
          password: 'hashed_password',
          role: 'member',
        }
      });

      // Assign some steps to the new user
      await prisma.stepInstance.update({
        where: { id: testStepIds[1] },
        data: { assigneeId: anotherUser.id }
      });

      // Get kanban filtered by specific assignee
      const response = await request(app.getHttpServer())
        .get(`/api/kanban/board?assigneeId=${anotherUser.id}`)
        .expect(200);

      // Verify filtering works
      let foundCount = 0;
      for (const column of response.body.columns) {
        for (const item of column.items) {
          if (item.assigneeId === anotherUser.id) {
            foundCount++;
          }
        }
      }
      expect(foundCount).toBeGreaterThan(0);

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });
});