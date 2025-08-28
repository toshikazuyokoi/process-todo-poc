import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('AI Agent Week 8-9 Features (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    // Create a test token
    authToken = jwtService.sign({
      sub: 1,
      email: 'test@example.com',
      id: 1,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Template Generation Flow', () => {
    it('should complete full template generation workflow', async () => {
      // Step 1: Start a new session
      const startSessionResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          industry: 'software',
          processType: 'development',
          goal: 'Implement user authentication system',
          additionalContext: 'Using OAuth2 and JWT tokens',
        })
        .expect(201);

      sessionId = startSessionResponse.body.sessionId;
      expect(sessionId).toBeDefined();
      expect(startSessionResponse.body.status).toBe('active');

      // Step 2: Send messages to build context
      const message1Response = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'We need to support Google and GitHub OAuth providers',
        })
        .expect(200);

      expect(message1Response.body.extractedRequirements).toBeDefined();
      expect(message1Response.body.conversationProgress).toBeDefined();

      const message2Response = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'The system should also support traditional email/password authentication',
        })
        .expect(200);

      expect(message2Response.body.extractedRequirements.length).toBeGreaterThan(0);

      // Step 3: Generate template recommendations
      const generateResponse = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/generate-template`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            complexity: 'medium',
            industry: 'software',
          },
        })
        .expect(201);

      expect(generateResponse.body.recommendations).toBeDefined();
      expect(generateResponse.body.recommendations.length).toBeGreaterThan(0);
      
      const firstRecommendation = generateResponse.body.recommendations[0];
      expect(firstRecommendation.id).toBeDefined();
      expect(firstRecommendation.name).toBeDefined();
      expect(firstRecommendation.steps).toBeDefined();
      expect(firstRecommendation.confidence).toBeGreaterThan(0);

      // Step 4: Finalize the template
      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/finalize-template`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: firstRecommendation.id,
          modifications: {
            name: 'Custom Authentication Implementation Process',
            steps: [
              {
                id: 'step-1',
                name: 'Requirements Analysis',
                duration: 16,
              },
            ],
          },
          notes: 'Customized for our specific needs',
        })
        .expect(201);

      expect(finalizeResponse.body.templateId).toBe(firstRecommendation.id);
      expect(finalizeResponse.body.name).toBe('Custom Authentication Implementation Process');
      expect(finalizeResponse.body.status).toBe('finalized');
      expect(finalizeResponse.body.createdAt).toBeDefined();
    });
  });

  describe('Best Practices Search', () => {
    it('should search for best practices with filters', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/best-practices/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'agile development best practices',
          filters: {
            industry: 'software',
            processType: 'development',
            complexity: 'medium',
            tags: ['agile', 'scrum'],
          },
          limit: 5,
        })
        .expect(200);

      expect(searchResponse.body.query).toBe('agile development best practices');
      expect(searchResponse.body.results).toBeDefined();
      expect(Array.isArray(searchResponse.body.results)).toBe(true);
      expect(searchResponse.body.totalResults).toBeDefined();
      expect(searchResponse.body.searchedAt).toBeDefined();
      expect(searchResponse.body.filters).toEqual({
        industry: 'software',
        processType: 'development',
        complexity: 'medium',
        tags: ['agile', 'scrum'],
      });

      // Check result structure if results exist
      if (searchResponse.body.results.length > 0) {
        const firstResult = searchResponse.body.results[0];
        expect(firstResult.id).toBeDefined();
        expect(firstResult.title).toBeDefined();
        expect(firstResult.description).toBeDefined();
        expect(firstResult.source).toMatch(/^(knowledge_base|web_research|community)$/);
        expect(firstResult.relevance).toBeGreaterThanOrEqual(0);
        expect(firstResult.relevance).toBeLessThanOrEqual(1);
      }
    });

    it('should search without filters', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/best-practices/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'process optimization',
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.query).toBe('process optimization');
      expect(searchResponse.body.results).toBeDefined();
      expect(searchResponse.body.filters).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should reject template generation without sufficient conversation', async () => {
      // Start a new session
      const newSessionResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          industry: 'finance',
          processType: 'compliance',
          goal: 'Test error handling',
        })
        .expect(201);

      const newSessionId = newSessionResponse.body.sessionId;

      // Try to generate template without conversation
      await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${newSessionId}/generate-template`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {},
        })
        .expect(400); // Should fail due to insufficient conversation
    });

    it('should reject template finalization with invalid session', async () => {
      await request(app.getHttpServer())
        .post('/api/ai-agent/sessions/invalid-session-id/finalize-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'template-1',
          notes: 'Test',
        })
        .expect(404);
    });

    it('should reject best practices search without query', async () => {
      await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/best-practices/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filters: {
            industry: 'software',
          },
        })
        .expect(400);
    });

    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/generate-template`)
        .send({
          preferences: {},
        })
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/finalize-template`)
        .send({
          templateId: 'template-1',
        })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/best-practices/search')
        .send({
          query: 'test',
        })
        .expect(401);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should maintain conversation history after template generation', async () => {
      // Get conversation history after template generation
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.sessionId).toBe(sessionId);
      expect(historyResponse.body.messages).toBeDefined();
      expect(Array.isArray(historyResponse.body.messages)).toBe(true);
      expect(historyResponse.body.messages.length).toBeGreaterThan(0);
    });

    it('should allow feedback submission after template generation', async () => {
      const feedbackResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          type: 'positive',
          category: 'accuracy',
          rating: 5,
          message: 'Template generation was very helpful',
          metadata: {
            feature: 'template-generation',
          },
        })
        .expect(201);

      expect(feedbackResponse.body.feedbackId).toBeDefined();
      expect(feedbackResponse.body.sessionId).toBe(sessionId);
      expect(feedbackResponse.body.status).toBe('collected');
    });
  });

  describe('Complex Workflow', () => {
    it('should handle complete workflow with modifications', async () => {
      // Start session
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          industry: 'healthcare',
          processType: 'patient-onboarding',
          goal: 'Create patient onboarding process',
          additionalContext: 'Must be HIPAA compliant',
        })
        .expect(201);

      const workflowSessionId = sessionResponse.body.sessionId;

      // Build context with multiple messages
      const messages = [
        'We need to collect patient information securely',
        'Insurance verification is required',
        'Medical history must be documented',
        'Consent forms need digital signatures',
      ];

      for (const message of messages) {
        await request(app.getHttpServer())
          .post(`/api/ai-agent/sessions/${workflowSessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message })
          .expect(200);
      }

      // Search for best practices
      const bestPracticesResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/best-practices/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'healthcare patient onboarding HIPAA',
          filters: {
            industry: 'healthcare',
            processType: 'patient-onboarding',
          },
          limit: 3,
        })
        .expect(200);

      expect(bestPracticesResponse.body.results).toBeDefined();

      // Generate template
      const templateResponse = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${workflowSessionId}/generate-template`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            complexity: 'high',
            industry: 'healthcare',
          },
        })
        .expect(201);

      expect(templateResponse.body.recommendations).toBeDefined();
      expect(templateResponse.body.recommendations.length).toBeGreaterThan(0);

      const templateId = templateResponse.body.recommendations[0].id;

      // Finalize with modifications
      const finalResponse = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${workflowSessionId}/finalize-template`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId,
          modifications: {
            name: 'HIPAA-Compliant Patient Onboarding',
            description: 'Secure patient onboarding process with compliance checks',
            steps: [
              {
                id: 'compliance-check',
                name: 'HIPAA Compliance Verification',
                description: 'Ensure all systems are HIPAA compliant',
                duration: 4,
                dependencies: [],
                artifacts: ['Compliance Checklist'],
                responsible: 'Compliance Officer',
              },
            ],
          },
          notes: 'Added specific HIPAA compliance step',
        })
        .expect(201);

      expect(finalResponse.body.name).toBe('HIPAA-Compliant Patient Onboarding');
      expect(finalResponse.body.status).toBe('finalized');
      
      // Verify the compliance step was added
      const complianceStep = finalResponse.body.steps.find(
        (s: any) => s.id === 'compliance-check',
      );
      expect(complianceStep).toBeDefined();
      expect(complianceStep.name).toBe('HIPAA Compliance Verification');

      // Submit feedback
      await request(app.getHttpServer())
        .post('/api/ai-agent/knowledge/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: workflowSessionId,
          type: 'positive',
          category: 'completeness',
          rating: 5,
          message: 'Comprehensive healthcare process generated',
        })
        .expect(201);

      // End session
      await request(app.getHttpServer())
        .delete(`/api/ai-agent/sessions/${workflowSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });
});