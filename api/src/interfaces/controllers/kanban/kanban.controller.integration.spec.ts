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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestDataFactory } from '../../../../test/factories/test-data.factory';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { MockJwtAuthGuard } from '../../../../test/mocks/auth.mock';

describe('KanbanController Integration Tests - Kanban Operations', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realtimeGateway: RealtimeGateway;
  let eventEmitter: EventEmitter2;
  let testUserId: number;
  let testAssigneeId: number;
  let testCaseId: number;
  let testStepIds: number[] = [];
  let testPrefix: string;
  let testTemplate: any;

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
    eventEmitter = app.get(EventEmitter2);

    // Mock WebSocket broadcast and EventEmitter
    jest.spyOn(realtimeGateway, 'broadcastStepUpdate').mockImplementation();
    jest.spyOn(eventEmitter, 'emit');

    // Get unique prefix for this test run
    testPrefix = TestDataFactory.getUniquePrefix();

    // Clean up only this test's data (not all test data)
    await TestDataFactory.cleanup(prisma, testPrefix);

    // Create test users using factory
    const owner = await TestDataFactory.createUser(prisma, {
      email: `${testPrefix}kanban.owner@example.com`,
      name: `${testPrefix}Kanban Owner`,
      role: 'admin'
    });
    testUserId = owner.id;

    const assignee = await TestDataFactory.createUser(prisma, {
      email: `${testPrefix}kanban.assignee@example.com`,
      name: `${testPrefix}Kanban Assignee`,
      role: 'member'
    });
    testAssigneeId = assignee.id;

    // Create test template with multiple steps using factory
    testTemplate = await TestDataFactory.createTemplate(prisma, {
      name: `${testPrefix}KANBAN_TEMPLATE`,
      stepCount: 3
    });

    // Create test case using factory
    const testCase = await TestDataFactory.createCase(prisma, {
      templateId: testTemplate.id,
      userId: testUserId,
      title: `${testPrefix}KANBAN_CASE`
    });
    testCaseId = testCase.id;

    // Create test step instances with different statuses using factory
    const stepStatuses = ['todo', 'in_progress', 'done', 'blocked', 'todo'];
    for (let i = 0; i < 5; i++) {
      const step = await TestDataFactory.createStep(prisma, {
        caseId: testCaseId,
        templateStepId: testTemplate.stepTemplates[i % 3].id,
        name: `${testPrefix}KANBAN_STEP_${i + 1}`,
        status: stepStatuses[i] as any,
        assigneeId: i % 2 === 0 ? testAssigneeId : null,
        dueDate: new Date(`2025-12-${20 + i}`)
      });
      testStepIds.push(step.id);
    }
  });

  afterAll(async () => {
    // Clean up test data using factory
    await TestDataFactory.cleanup(prisma, testPrefix);

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
      expect(testUser).toHaveProperty('name', `${testPrefix}Kanban Assignee`);
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
    let dragDropStepId: number;
    let dragDropCaseId: number;

    beforeEach(async () => {
      // Create a dedicated case for this test to avoid conflicts
      const dragDropCase = await TestDataFactory.createCase(prisma, {
        templateId: testTemplate.id,
        userId: testUserId,
        title: `${testPrefix}DRAG_DROP_CASE_${Date.now()}`
      });
      dragDropCaseId = dragDropCase.id;

      // Create a fresh step for each test
      const step = await TestDataFactory.createStep(prisma, {
        caseId: dragDropCaseId, // Use dedicated case ID instead of shared testCaseId
        templateStepId: testTemplate.stepTemplates[0].id,
        name: `${testPrefix}DRAG_DROP_STEP_${Date.now()}`,
        status: 'todo',
        assigneeId: testAssigneeId
      });
      dragDropStepId = step.id;
    });

    afterEach(async () => {
      // Clean up the test step first (due to foreign key constraints)
      await prisma.stepInstance.delete({ 
        where: { id: dragDropStepId } 
      }).catch(() => {});
      
      // Then clean up the test case
      await prisma.case.delete({ 
        where: { id: dragDropCaseId } 
      }).catch(() => {});
    });

    it('should handle complete drag-and-drop workflow', async () => {
      const todoStepId = dragDropStepId;

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

      // Verify event was emitted (EventEmitter-based architecture)
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'step.status.updated',
        expect.objectContaining({
          caseId: dragDropCaseId,
          stepId: todoStepId,
          oldStatus: 'todo',
          newStatus: 'in_progress'
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
      // Create a new step for this test
      const blockedTestStep = await TestDataFactory.createStep(prisma, {
        caseId: testCaseId,
        templateStepId: testTemplate.stepTemplates[0].id,
        name: `${testPrefix}BLOCKED_TEST_STEP_${Date.now()}`,
        status: 'todo',
        assigneeId: testAssigneeId
      });
      const stepId = blockedTestStep.id;

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

      // Clean up
      await prisma.stepInstance.delete({ 
        where: { id: stepId } 
      }).catch(() => {});
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
          expect(item.assigneeName).toBe(`${testPrefix}Kanban Assignee`);
        }
      }
    });

    it('should support filtering by multiple assignees', async () => {
      // Create another user using factory
      const anotherUser = await TestDataFactory.createUser(prisma, {
        email: `${testPrefix}kanban.another@example.com`,
        name: `${testPrefix}Another User`,
        role: 'member'
      });

      // Create a dedicated case for this test
      const multiUserCase = await TestDataFactory.createCase(prisma, {
        templateId: testTemplate.id,
        userId: testUserId,
        title: `${testPrefix}MULTI_USER_CASE_${Date.now()}`
      });

      // Create a new step for the new user
      const newStep = await TestDataFactory.createStep(prisma, {
        caseId: multiUserCase.id,
        templateStepId: testTemplate.stepTemplates[0].id,
        name: `${testPrefix}MULTI_USER_STEP_${Date.now()}`,
        status: 'todo',
        assigneeId: anotherUser.id
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
      await prisma.stepInstance.delete({ 
        where: { id: newStep.id } 
      }).catch(() => {});
      await prisma.case.delete({ 
        where: { id: multiUserCase.id } 
      }).catch(() => {});
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });
});