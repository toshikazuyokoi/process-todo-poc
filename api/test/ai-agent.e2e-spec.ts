import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('AI Agent E2E Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create test user and generate JWT token
    const testUser = await prismaService.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'hashed_password', // In real scenario, this would be properly hashed
      },
    });
    userId = testUser.id;

    authToken = jwtService.sign({ 
      sub: testUser.id, 
      email: testUser.email,
      id: testUser.id,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.interviewSession.deleteMany({
      where: { userId },
    });
    await prismaService.user.delete({
      where: { id: userId },
    });
    await app.close();
  });

  describe('Session Management Flow', () => {
    let sessionId: string;

    describe('POST /api/ai-agent/sessions', () => {
      it('should create a new session with valid data', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            industry: 'ソフトウェア開発',
            processType: 'アジャイル開発',
            goal: 'プロセスの効率化と品質向上',
          })
          .expect(HttpStatus.CREATED);

        // Assert
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('status', 'active');
        expect(response.body).toHaveProperty('context');
        expect(response.body.context).toMatchObject({
          industry: 'ソフトウェア開発',
          processType: 'アジャイル開発',
          goal: 'プロセスの効率化と品質向上',
        });
        expect(response.body).toHaveProperty('conversation');
        expect(response.body.conversation).toHaveLength(1);
        expect(response.body.conversation[0]).toHaveProperty('role', 'assistant');
        expect(response.body).toHaveProperty('expiresAt');

        sessionId = response.body.sessionId;
      });

      it('should reject invalid industry field', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            industry: '', // Empty string
            processType: 'アジャイル開発',
            goal: 'プロセス改善',
          })
          .expect(HttpStatus.BAD_REQUEST);

        // Assert
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('industry');
      });

      it('should reject missing required fields', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            industry: 'IT',
            // Missing processType and goal
          })
          .expect(HttpStatus.BAD_REQUEST);

        // Assert
        expect(response.body).toHaveProperty('message');
      });

      it('should reject unauthorized requests', async () => {
        // Act
        await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .send({
            industry: 'IT',
            processType: 'DevOps',
            goal: 'Automation',
          })
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('should handle rate limiting', async () => {
        // Create multiple sessions to trigger rate limit
        const promises = [];
        for (let i = 0; i < 6; i++) {
          promises.push(
            request(app.getHttpServer())
              .post('/api/ai-agent/sessions')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                industry: `Industry ${i}`,
                processType: `Process ${i}`,
                goal: `Goal ${i}`,
              }),
          );
        }

        const responses = await Promise.all(promises);
        const tooManyRequests = responses.filter(
          r => r.status === HttpStatus.TOO_MANY_REQUESTS
        );
        
        // At least one should be rate limited (after 5 sessions per day)
        expect(tooManyRequests.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/ai-agent/sessions/:sessionId', () => {
      it('should retrieve existing session', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get(`/api/ai-agent/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        // Assert
        expect(response.body).toHaveProperty('sessionId', sessionId);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('context');
        expect(response.body).toHaveProperty('conversation');
        expect(response.body).toHaveProperty('requirements');
      });

      it('should return 404 for non-existent session', async () => {
        // Act
        await request(app.getHttpServer())
          .get('/api/ai-agent/sessions/non-existent-session')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should deny access to other user sessions', async () => {
        // Create another user and session
        const otherUser = await prismaService.user.create({
          data: {
            email: `other-${Date.now()}@example.com`,
            name: 'Other User',
            password: 'hashed_password',
          },
        });

        const otherSession = await prismaService.interviewSession.create({
          data: {
            sessionId: 'other-user-session',
            userId: otherUser.id,
            status: 'active',
            context: {
              industry: 'Other',
              processType: 'Other',
              goal: 'Other',
            },
            conversation: [],
            extractedRequirements: [],
            expiresAt: new Date(Date.now() + 3600000),
          },
        });

        // Act
        await request(app.getHttpServer())
          .get(`/api/ai-agent/sessions/${otherSession.sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NOT_FOUND);

        // Cleanup
        await prismaService.interviewSession.delete({
          where: { id: otherSession.id },
        });
        await prismaService.user.delete({
          where: { id: otherUser.id },
        });
      });
    });

    describe('POST /api/ai-agent/sessions/:sessionId/messages', () => {
      it('should process a valid message', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post(`/api/ai-agent/sessions/${sessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: '現在のプロセスでは要件定義から実装まで3ヶ月かかっています。',
          })
          .expect(HttpStatus.OK);

        // Assert
        expect(response.body).toHaveProperty('sessionId', sessionId);
        expect(response.body).toHaveProperty('userMessage');
        expect(response.body.userMessage).toHaveProperty('content');
        expect(response.body).toHaveProperty('aiResponse');
        expect(response.body.aiResponse).toHaveProperty('content');
        expect(response.body).toHaveProperty('conversationProgress');
        expect(response.body).toHaveProperty('usage');
      });

      it('should reject empty message', async () => {
        // Act
        await request(app.getHttpServer())
          .post(`/api/ai-agent/sessions/${sessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: '',
          })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should reject message exceeding max length', async () => {
        // Act
        const longMessage = 'a'.repeat(2001);
        await request(app.getHttpServer())
          .post(`/api/ai-agent/sessions/${sessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: longMessage,
          })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should handle message with metadata', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post(`/api/ai-agent/sessions/${sessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'テストメッセージ',
            metadata: {
              source: 'e2e-test',
              timestamp: new Date().toISOString(),
            },
          })
          .expect(HttpStatus.OK);

        // Assert
        expect(response.body).toHaveProperty('sessionId');
      });

      it('should return 404 for non-existent session', async () => {
        // Act
        await request(app.getHttpServer())
          .post('/api/ai-agent/sessions/non-existent/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'Test message',
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('GET /api/ai-agent/sessions/:sessionId/messages', () => {
      it('should retrieve conversation history', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get(`/api/ai-agent/sessions/${sessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        // Assert
        expect(response.body).toHaveProperty('sessionId', sessionId);
        expect(response.body).toHaveProperty('messages');
        expect(Array.isArray(response.body.messages)).toBe(true);
        expect(response.body).toHaveProperty('totalMessages');
        expect(response.body.totalMessages).toBeGreaterThan(0);
        expect(response.body).toHaveProperty('startedAt');
        expect(response.body).toHaveProperty('lastMessageAt');
      });

      it('should return empty history for new session', async () => {
        // Create a new session
        const newSessionResponse = await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            industry: 'Test Industry',
            processType: 'Test Process',
            goal: 'Test Goal',
          })
          .expect(HttpStatus.CREATED);

        const newSessionId = newSessionResponse.body.sessionId;

        // Act
        const response = await request(app.getHttpServer())
          .get(`/api/ai-agent/sessions/${newSessionId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        // Assert
        expect(response.body.messages).toHaveLength(1); // Only welcome message
        expect(response.body.messages[0].role).toBe('assistant');
      });
    });

    describe('DELETE /api/ai-agent/sessions/:sessionId', () => {
      it('should end an active session', async () => {
        // Create a session to end
        const sessionResponse = await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            industry: 'End Test',
            processType: 'End Process',
            goal: 'End Goal',
          })
          .expect(HttpStatus.CREATED);

        const endSessionId = sessionResponse.body.sessionId;

        // Act
        await request(app.getHttpServer())
          .delete(`/api/ai-agent/sessions/${endSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NO_CONTENT);

        // Verify session is completed
        const getResponse = await request(app.getHttpServer())
          .get(`/api/ai-agent/sessions/${endSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(getResponse.body.status).toBe('completed');
      });

      it('should return 404 for non-existent session', async () => {
        // Act
        await request(app.getHttpServer())
          .delete('/api/ai-agent/sessions/non-existent')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should handle already completed session gracefully', async () => {
        // Create and end a session
        const sessionResponse = await request(app.getHttpServer())
          .post('/api/ai-agent/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            industry: 'Double End Test',
            processType: 'Double End Process',
            goal: 'Double End Goal',
          })
          .expect(HttpStatus.CREATED);

        const doubleEndSessionId = sessionResponse.body.sessionId;

        // End it once
        await request(app.getHttpServer())
          .delete(`/api/ai-agent/sessions/${doubleEndSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NO_CONTENT);

        // End it again - should not fail
        await request(app.getHttpServer())
          .delete(`/api/ai-agent/sessions/${doubleEndSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NO_CONTENT);
      });
    });
  });

  describe('Complete Interview Flow', () => {
    it('should complete full interview workflow', async () => {
      // Step 1: Create session
      const createResponse = await request(app.getHttpServer())
        .post('/api/ai-agent/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          industry: '製造業',
          processType: '品質管理プロセス',
          goal: '不良品率を50%削減し、検査効率を向上させる',
        })
        .expect(HttpStatus.CREATED);

      const sessionId = createResponse.body.sessionId;
      expect(createResponse.body.conversation[0].role).toBe('assistant');

      // Step 2: Send first message
      const message1Response = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '現在、製品の検査に1個あたり5分かかっており、不良品率は10%です。',
        })
        .expect(HttpStatus.OK);

      expect(message1Response.body.aiResponse).toBeDefined();

      // Step 3: Send follow-up message
      const message2Response = await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '検査項目は外観、寸法、機能の3つです。自動化できる部分を探しています。',
        })
        .expect(HttpStatus.OK);

      expect(message2Response.body.conversationProgress.totalMessages).toBeGreaterThan(2);

      // Step 4: Get conversation history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(historyResponse.body.messages.length).toBeGreaterThanOrEqual(3);
      expect(historyResponse.body.messages.some(m => m.role === 'user')).toBe(true);
      expect(historyResponse.body.messages.some(m => m.role === 'assistant')).toBe(true);

      // Step 5: Get session details
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/ai-agent/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(sessionResponse.body.context.industry).toBe('製造業');
      expect(sessionResponse.body.conversation.length).toBeGreaterThan(0);

      // Step 6: End session
      await request(app.getHttpServer())
        .delete(`/api/ai-agent/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Step 7: Verify session is completed
      const finalResponse = await request(app.getHttpServer())
        .get(`/api/ai-agent/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(finalResponse.body.status).toBe('completed');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle expired session', async () => {
      // Create an expired session directly in database
      const expiredSession = await prismaService.interviewSession.create({
        data: {
          sessionId: 'expired-session-test',
          userId,
          status: 'expired',
          context: {
            industry: 'Test',
            processType: 'Test',
            goal: 'Test',
          },
          conversation: [],
          extractedRequirements: [],
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });

      // Try to send message to expired session
      await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${expiredSession.sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
        })
        .expect(HttpStatus.BAD_REQUEST);

      // Cleanup
      await prismaService.interviewSession.delete({
        where: { id: expiredSession.id },
      });
    });

    it('should handle invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/api/ai-agent/sessions/any-session')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should handle missing authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/ai-agent/sessions/any-session')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('WebSocket Integration', () => {
    it('should trigger WebSocket notifications on session events', async () => {
      // This test would require WebSocket client setup
      // For now, we verify that the operations complete without WebSocket errors
      
      const response = await request(app.getHttpServer())
        .post('/api/ai-agent/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          industry: 'WebSocket Test',
          processType: 'Real-time Process',
          goal: 'Test notifications',
        })
        .expect(HttpStatus.CREATED);

      const sessionId = response.body.sessionId;

      // Send message (should trigger WebSocket notification)
      await request(app.getHttpServer())
        .post(`/api/ai-agent/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'WebSocket test message',
        })
        .expect(HttpStatus.OK);

      // End session (should trigger WebSocket notification)
      await request(app.getHttpServer())
        .delete(`/api/ai-agent/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('Concurrent Session Handling', () => {
    it('should handle multiple concurrent sessions', async () => {
      // Create multiple sessions concurrently
      const sessionPromises = [];
      for (let i = 0; i < 3; i++) {
        sessionPromises.push(
          request(app.getHttpServer())
            .post('/api/ai-agent/sessions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              industry: `Industry ${i}`,
              processType: `Process ${i}`,
              goal: `Goal ${i}`,
            }),
        );
      }

      const sessions = await Promise.all(sessionPromises);
      const sessionIds = sessions
        .filter(s => s.status === HttpStatus.CREATED)
        .map(s => s.body.sessionId);

      expect(sessionIds.length).toBeGreaterThan(0);

      // Send messages to all sessions concurrently
      const messagePromises = sessionIds.map(sid =>
        request(app.getHttpServer())
          .post(`/api/ai-agent/sessions/${sid}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: `Concurrent message for session ${sid}`,
          }),
      );

      const messageResponses = await Promise.all(messagePromises);
      const successfulMessages = messageResponses.filter(
        r => r.status === HttpStatus.OK
      );

      expect(successfulMessages.length).toBe(sessionIds.length);

      // Clean up sessions
      await Promise.all(
        sessionIds.map(sid =>
          request(app.getHttpServer())
            .delete(`/api/ai-agent/sessions/${sid}`)
            .set('Authorization', `Bearer ${authToken}`),
        ),
      );
    });
  });
});