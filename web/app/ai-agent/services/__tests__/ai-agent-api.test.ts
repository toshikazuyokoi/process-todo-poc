/**
 * AI Agent API Service Integration Test
 */

import { aiAgentApi } from '../ai-agent-api';
import { apiClient } from '../../../../lib/api-client';
import { SessionStatus, MessageRole } from '../../types';

// Mock the API client
jest.mock('../../../../lib/api-client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AI Agent API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create a session with correct parameters', async () => {
        const mockResponse = {
          sessionId: 'new-session-123',
          status: SessionStatus.ACTIVE,
          userId: 1,
          context: {
            industry: 'Technology',
            processType: 'Software Development',
            goal: 'Build MVP',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await aiAgentApi.createSession({
          industry: 'Technology',
          processType: 'Software Development',
          goal: 'Build MVP',
          additionalContext: { budget: 50000 },
        });

        expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai-agent/sessions', {
          industry: 'Technology',
          processType: 'Software Development',
          goal: 'Build MVP',
          additionalContext: { budget: 50000 },
        });

        expect(result).toEqual(mockResponse);
      });

      it('should handle creation errors', async () => {
        const mockError = new Error('Failed to create session');
        mockedApiClient.post.mockRejectedValueOnce(mockError);

        await expect(
          aiAgentApi.createSession({
            industry: 'Tech',
            processType: 'Dev',
            goal: 'Test',
          })
        ).rejects.toThrow('Failed to create session');
      });
    });

    describe('getSession', () => {
      it('should get session by ID', async () => {
        const mockSession = {
          id: 'session-123',
          status: SessionStatus.ACTIVE,
          userId: 1,
          context: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockedApiClient.get.mockResolvedValueOnce({ data: mockSession });

        const result = await aiAgentApi.getSession('session-123');

        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/ai-agent/sessions/session-123');
        expect(result).toEqual(mockSession);
      });
    });

    describe('endSession', () => {
      it('should end session using DELETE method', async () => {
        mockedApiClient.delete.mockResolvedValueOnce({ data: { success: true } });

        await aiAgentApi.endSession('session-123');

        expect(mockedApiClient.delete).toHaveBeenCalledWith('/api/ai-agent/sessions/session-123');
      });
    });

    describe('updateSessionStatus', () => {
      it('should update session status', async () => {
        const updatedSession = {
          id: 'session-123',
          status: SessionStatus.PAUSED,
          userId: 1,
          context: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockedApiClient.patch.mockResolvedValueOnce({ data: updatedSession });

        const result = await aiAgentApi.updateSessionStatus('session-123', SessionStatus.PAUSED);

        expect(mockedApiClient.patch).toHaveBeenCalledWith(
          '/api/ai-agent/sessions/session-123/status',
          { status: SessionStatus.PAUSED }
        );
        expect(result).toEqual(updatedSession);
      });
    });
  });

  describe('Message Management', () => {
    describe('sendMessage', () => {
      it('should send a message to the session', async () => {
        const mockMessage = {
          id: 'msg-123',
          sessionId: 'session-123',
          content: 'Hello AI',
          role: MessageRole.USER,
          createdAt: new Date().toISOString(),
        };

        mockedApiClient.post.mockResolvedValueOnce({ data: mockMessage });

        const result = await aiAgentApi.sendMessage('session-123', 'Hello AI');

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/ai-agent/sessions/session-123/messages',
          {
            content: 'Hello AI',
            role: MessageRole.USER,
          }
        );
        expect(result).toEqual(mockMessage);
      });
    });

    describe('getMessages', () => {
      it('should get messages for a session', async () => {
        const mockMessages = [
          {
            id: 'msg-1',
            sessionId: 'session-123',
            content: 'Hello',
            role: MessageRole.USER,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'msg-2',
            sessionId: 'session-123',
            content: 'Hi there!',
            role: MessageRole.ASSISTANT,
            createdAt: new Date().toISOString(),
          },
        ];

        mockedApiClient.get.mockResolvedValueOnce({ data: mockMessages });

        const result = await aiAgentApi.getMessages('session-123');

        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/ai-agent/sessions/session-123/messages');
        expect(result).toEqual(mockMessages);
      });
    });
  });

  describe('Template Generation', () => {
    describe('generateTemplate', () => {
      it('should generate template for a session', async () => {
        const mockTemplate = {
          id: 'template-123',
          sessionId: 'session-123',
          name: 'Software Development Process',
          description: 'MVP development template',
          steps: [
            {
              id: 'step-1',
              name: 'Requirements',
              description: 'Gather requirements',
              duration: 5,
              dependencies: [],
            },
          ],
          metadata: {
            generatedAt: new Date().toISOString(),
            generationTime: 5000,
            confidence: 0.85,
            sources: ['best-practice-1'],
          },
        };

        mockedApiClient.post.mockResolvedValueOnce({ data: mockTemplate });

        const result = await aiAgentApi.generateTemplate('session-123');

        expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai-agent/sessions/session-123/generate-template');
        expect(result).toEqual(mockTemplate);
      });
    });

    describe('getGeneratedTemplate', () => {
      it('should get generated template', async () => {
        const mockTemplate = {
          id: 'template-123',
          sessionId: 'session-123',
          name: 'Generated Template',
          description: 'Description',
          steps: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            generationTime: 3000,
            confidence: 0.9,
            sources: [],
          },
        };

        mockedApiClient.get.mockResolvedValueOnce({ data: mockTemplate });

        const result = await aiAgentApi.getGeneratedTemplate('session-123');

        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/ai-agent/sessions/session-123/template');
        expect(result).toEqual(mockTemplate);
      });
    });

    describe('approveTemplate', () => {
      it('should approve template with modifications', async () => {
        const mockResponse = {
          success: true,
          processTemplateId: 'process-template-456',
        };

        mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

        const modifications = {
          name: 'Modified Name',
          steps: [],
        };

        const result = await aiAgentApi.approveTemplate('session-123', 'template-123', modifications);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/ai-agent/sessions/session-123/template/template-123/approve',
          { modifications }
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Research', () => {
    describe('getResearchResults', () => {
      it('should get research results for a session', async () => {
        const mockResults = [
          {
            source: 'Industry Best Practice',
            type: 'best_practice' as const,
            relevance: 0.95,
            summary: 'Agile methodology for MVP development',
            url: 'https://example.com/agile',
          },
          {
            source: 'Template Library',
            type: 'template' as const,
            relevance: 0.88,
            summary: 'Standard software development template',
          },
        ];

        mockedApiClient.get.mockResolvedValueOnce({ data: mockResults });

        const result = await aiAgentApi.getResearchResults('session-123');

        expect(mockedApiClient.get).toHaveBeenCalledWith('/api/ai-agent/sessions/session-123/research');
        expect(result).toEqual(mockResults);
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate API errors with response data', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid session parameters',
            code: 'INVALID_PARAMS',
          },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(mockError);

      try {
        await aiAgentApi.createSession({
          industry: '',
          processType: '',
          goal: '',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Invalid session parameters');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';

      mockedApiClient.get.mockRejectedValueOnce(networkError);

      await expect(aiAgentApi.getSession('session-123')).rejects.toThrow('Network error');
    });
  });
});