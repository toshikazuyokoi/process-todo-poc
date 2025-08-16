import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { TestDataFactory } from './test-data.factory';
import { AppModule } from '../../src/app.module';

describe('TestDataFactory', () => {
  let prisma: PrismaService;
  let testPrefix: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testPrefix) {
      await TestDataFactory.cleanup(prisma, testPrefix);
    }
  });

  describe('getUniquePrefix', () => {
    it('should generate unique prefixes', () => {
      const prefix1 = TestDataFactory.getUniquePrefix();
      const prefix2 = TestDataFactory.getUniquePrefix();
      
      expect(prefix1).toMatch(/^TEST_\d+_\d+_$/);
      expect(prefix2).toMatch(/^TEST_\d+_\d+_$/);
      expect(prefix1).not.toBe(prefix2);
    });
  });

  describe('createUser', () => {
    it('should create a user with default values', async () => {
      testPrefix = TestDataFactory.getUniquePrefix();
      
      const user = await TestDataFactory.createUser(prisma);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toMatch(/^TEST_.*@example\.com$/);
      expect(user.role).toBe('member');
    });

    it('should create a user with custom values', async () => {
      testPrefix = TestDataFactory.getUniquePrefix();
      
      const user = await TestDataFactory.createUser(prisma, {
        email: `${testPrefix}custom@test.com`,
        name: `${testPrefix}Custom User`,
        role: 'admin'
      });
      
      expect(user.email).toBe(`${testPrefix}custom@test.com`);
      expect(user.name).toBe(`${testPrefix}Custom User`);
      expect(user.role).toBe('admin');
    });
  });

  describe('createTemplate', () => {
    it('should create a template with step templates', async () => {
      testPrefix = TestDataFactory.getUniquePrefix();
      
      const template = await TestDataFactory.createTemplate(prisma, {
        name: `${testPrefix}TEMPLATE`,
        stepCount: 3
      });
      
      expect(template).toBeDefined();
      expect(template.name).toBe(`${testPrefix}TEMPLATE`);
      expect(template.stepTemplates).toHaveLength(3);
      expect(template.stepTemplates[0].seq).toBe(1);
      expect(template.stepTemplates[0].basis).toBe('goal');
      expect(template.stepTemplates[1].basis).toBe('prev');
    });
  });

  describe('createCompleteSetup', () => {
    it('should create a complete test setup', async () => {
      const setup = await TestDataFactory.createCompleteSetup(prisma, {
        stepCount: 2
      });
      
      testPrefix = setup.prefix;
      
      expect(setup.user).toBeDefined();
      expect(setup.template).toBeDefined();
      expect(setup.case).toBeDefined();
      expect(setup.steps).toHaveLength(2);
      expect(setup.prefix).toMatch(/^TEST_\d+_\d+_$/);
      
      // Verify relationships
      expect(setup.case.processId).toBe(setup.template.id);
      expect(setup.case.createdBy).toBe(setup.user.id);
      expect(setup.steps[0].caseId).toBe(setup.case.id);
    });
  });

  describe('cleanup', () => {
    it('should clean up all data with given prefix', async () => {
      // Create test data
      const setup = await TestDataFactory.createCompleteSetup(prisma, {
        stepCount: 1
      });
      
      const prefix = setup.prefix;
      
      // Verify data exists
      const userBefore = await prisma.user.findUnique({
        where: { id: setup.user.id }
      });
      expect(userBefore).toBeDefined();
      
      // Clean up
      await TestDataFactory.cleanup(prisma, prefix);
      
      // Verify data is deleted
      const userAfter = await prisma.user.findUnique({
        where: { id: setup.user.id }
      });
      expect(userAfter).toBeNull();
      
      const caseAfter = await prisma.case.findUnique({
        where: { id: setup.case.id }
      });
      expect(caseAfter).toBeNull();
    });
  });
});