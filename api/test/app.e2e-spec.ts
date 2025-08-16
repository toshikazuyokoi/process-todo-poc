import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/infrastructure/auth/guards/roles.guard';
import { PermissionsGuard } from '../src/infrastructure/auth/guards/permissions.guard';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api', {
      exclude: ['health'],
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  describe('Process Templates', () => {
    it('/api/process-templates (POST) - should create a new template', () => {
      const createDto = {
        name: 'Test Process Template',
        stepTemplates: [
          {
            seq: 1,
            name: 'Step 1',
            basis: 'goal',
            offsetDays: -10,
            requiredArtifacts: [],
            dependsOn: [],
          },
          {
            seq: 2,
            name: 'Step 2',
            basis: 'prev',
            offsetDays: 3,
            requiredArtifacts: [],
            dependsOn: [],
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/process-templates')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'Test Process Template');
          expect(res.body.stepTemplates).toHaveLength(2);
        });
    });

    it('/api/process-templates (POST) - should validate required fields', () => {
      const invalidDto = {
        stepTemplates: [],
      };

      return request(app.getHttpServer())
        .post('/api/process-templates')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Cases', () => {
    it('/api/cases (POST) - should validate required fields', () => {
      const invalidDto = {
        title: 'Test Case',
      };

      return request(app.getHttpServer())
        .post('/api/cases')
        .send(invalidDto)
        .expect(400);
    });
  });
});