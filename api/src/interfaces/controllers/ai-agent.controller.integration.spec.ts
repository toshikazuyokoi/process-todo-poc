import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { MockJwtAuthGuard, overrideAuthGuards } from '../../../test/mocks/auth.mock';
import { TestDataFactory } from '../../../test/factories/test-data.factory';
import { AIRateLimitGuard } from '../guards/ai-rate-limit.guard';
import { AIFeatureFlagGuard } from '../../infrastructure/security/ai-feature-flag.guard';
import { FeatureFlagService } from '../../infrastructure/security/ai-feature-flag.guard';

// Seed helper
async function seedSessionWithDraft(prisma: PrismaService, opts: { sessionId: string; userId: number; draft: any }) {
  const now = new Date();
  await prisma.aIInterviewSession.create({
    data: {
      sessionId: opts.sessionId,
      userId: opts.userId,
      status: 'active',
      context: { industry: 'software', processType: 'development', goal: 'Finalize test' },
      conversation: [],
      extractedRequirements: [],
      generatedTemplate: opts.draft,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    },
  });
}

describe('AIAgentController (integration) – finalize', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let createdUserId: number;
  const sessionId = '550e8400-e29b-41d4-a716-446655440000';
  const draft = {
    id: 'template-1',
    name: 'Draft Name',
    description: 'Draft description',
    steps: [
      { id: 's1', name: 'Step 1', description: 'desc', duration: 5, dependencies: [], artifacts: [], responsible: 'Team', criticalPath: false },
      { id: 's2', name: 'Step 2', description: 'desc2', duration: 3, dependencies: [], artifacts: [], responsible: 'Team', criticalPath: false },
    ],
    confidence: 0.9,
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await overrideAuthGuards(
      Test.createTestingModule({ imports: [AppModule] })
    )
      .overrideGuard(AIRateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AIFeatureFlagGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    prisma = app.get(PrismaService);
    await app.init();

    // Prepare user and clean state
    const user = await TestDataFactory.createUser(prisma, { email: `finalize_user_${Date.now()}@example.com` });
    createdUserId = user.id;

    await prisma.aIInterviewSession.deleteMany({ where: { sessionId } });
    // Clean any pre-existing templates named 'Draft Name' (delete stepTemplates first)
    const existing = await prisma.processTemplate.findMany({ where: { name: 'Draft Name' }, include: { stepTemplates: true } });
    for (const t of existing) {
      await prisma.stepTemplate.deleteMany({ where: { processId: t.id } });
      await prisma.processTemplate.delete({ where: { id: t.id } });
    }

    await seedSessionWithDraft(prisma, { sessionId, userId: createdUserId, draft });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.aIInterviewSession.deleteMany({ where: { sessionId } });
    // Delete stepTemplates first due to FK constraint
    const templates = await prisma.processTemplate.findMany({ where: { name: 'Draft Name' }, include: { stepTemplates: true } });
    for (const t of templates) {
      await prisma.stepTemplate.deleteMany({ where: { processId: t.id } });
      await prisma.processTemplate.delete({ where: { id: t.id } });
    }
    await prisma.user.deleteMany({ where: { id: createdUserId } });
    await app.close();
  });

  it('POST /api/ai-agent/sessions/:sessionId/finalize-template should create ProcessTemplate and complete session', async () => {
    // Mock authenticated user id used by guard
    MockJwtAuthGuard.mockUserId = createdUserId;

    const res = await request(app.getHttpServer())
      .post(`/api/ai-agent/sessions/${sessionId}/finalize-template`)
      .send({ templateId: draft.id, notes: 'integration' })
      .expect(201);

    // Response shape
    expect(res.body).toMatchObject({
      sessionId,
      templateId: draft.id,
      name: draft.name,
      status: 'finalized',
    });

    // Check DB: template exists
    const saved = await prisma.processTemplate.findFirst({ where: { name: draft.name }, include: { stepTemplates: true } });
    expect(saved).toBeTruthy();
    expect(saved?.stepTemplates?.length).toBeGreaterThanOrEqual(1);

    // Check session completed
    const session = await prisma.aIInterviewSession.findUnique({ where: { sessionId } });
    expect(session?.status).toBe('completed');
  });
});

