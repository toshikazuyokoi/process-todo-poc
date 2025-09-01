/**
 * E2E Basic Flow Test for AI Agent
 * Tests the complete user journey from session creation to template generation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIAgentPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/ai-agent',
}));

// Mock API client with realistic responses
jest.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock toast
const mockAddToast = jest.fn();
jest.mock('../../../components/ui/toast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

// Mock WebSocket
const mockSocketEvents: { [key: string]: Function[] } = {};
const mockSocket = {
  connected: true,
  emit: jest.fn(),
  on: jest.fn((event: string, callback: Function) => {
    if (!mockSocketEvents[event]) {
      mockSocketEvents[event] = [];
    }
    mockSocketEvents[event].push(callback);
  }),
  off: jest.fn((event: string, callback: Function) => {
    if (mockSocketEvents[event]) {
      mockSocketEvents[event] = mockSocketEvents[event].filter(cb => cb !== callback);
    }
  }),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

import { apiClient } from '../../../lib/api-client';
import { SessionStatus, MessageRole } from '../types';

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AI Agent E2E Basic Flow', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    jest.clearAllMocks();
    mockAddToast.mockClear();
    
    // Clear mock events
    Object.keys(mockSocketEvents).forEach(key => {
      mockSocketEvents[key] = [];
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Complete User Journey', () => {
    it('should complete full flow from session creation to template generation', async () => {
      // Step 1: Initial page load - no existing session
      mockedApiClient.get.mockResolvedValueOnce({ 
        data: null // No existing session
      });

      const { container } = render(<AIAgentPage />, { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/AIエージェント/)).toBeInTheDocument();
      });

      // Should show welcome screen when idle
      expect(screen.getByText(/プロセステンプレートの作成をAIがサポート/)).toBeInTheDocument();

      // Step 2: Start new session
      const startButton = screen.getByRole('button', { name: /新しいセッションを開始/ });
      expect(startButton).toBeInTheDocument();

      // Fill in session context form
      const industryInput = screen.getByLabelText(/業界/);
      const processTypeInput = screen.getByLabelText(/プロセスタイプ/);
      const goalInput = screen.getByLabelText(/目標/);

      await user.type(industryInput, 'ソフトウェア開発');
      await user.type(processTypeInput, 'アジャイル開発');
      await user.type(goalInput, 'MVPの構築');

      // Mock session creation response
      const mockSession = {
        sessionId: 'session-e2e-test',
        status: SessionStatus.ACTIVE,
        userId: 1,
        context: {
          industry: 'ソフトウェア開発',
          processType: 'アジャイル開発',
          goal: 'MVPの構築',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockSession });
      mockedApiClient.get.mockResolvedValueOnce({ data: [] }); // Empty messages

      await user.click(startButton);

      // Step 3: Verify session is created
      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai-agent/sessions', {
          industry: 'ソフトウェア開発',
          processType: 'アジャイル開発',
          goal: 'MVPの構築',
        });
      });

      // Should show success toast
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          title: 'AI session started',
          message: 'You can now start chatting with the AI assistant.',
        });
      });

      // Step 4: Send message in chat
      const messageInput = await screen.findByPlaceholderText(/メッセージを入力/);
      const sendButton = screen.getByRole('button', { name: /送信/ });

      await user.type(messageInput, 'MVPに必要な最小限の機能を教えてください');

      // Mock message send response
      const userMessage = {
        id: 'msg-user-1',
        sessionId: 'session-e2e-test',
        content: 'MVPに必要な最小限の機能を教えてください',
        role: MessageRole.USER,
        createdAt: new Date().toISOString(),
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: userMessage });

      await user.click(sendButton);

      // Verify message was sent
      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/ai-agent/sessions/session-e2e-test/messages',
          {
            content: 'MVPに必要な最小限の機能を教えてください',
            role: MessageRole.USER,
          }
        );
      });

      // Step 5: Receive AI response via WebSocket
      const aiResponse = {
        sessionId: 'session-e2e-test',
        messageId: 'msg-ai-1',
        content: 'MVPには以下の最小限の機能が必要です：\n1. ユーザー認証\n2. コア機能の実装\n3. 基本的なUI/UX',
        role: MessageRole.ASSISTANT,
        metadata: {
          tokenCount: 50,
          processingTime: 1500,
        },
      };

      // Simulate typing indicator
      act(() => {
        mockSocketEvents['ai:message:typing']?.[0]?.({
          sessionId: 'session-e2e-test',
          isTyping: true,
          stage: 'thinking',
        });
      });

      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText(/Thinking/)).toBeInTheDocument();
      });

      // Simulate AI response
      act(() => {
        mockSocketEvents['ai:message:received']?.[0]?.(aiResponse);
      });

      // Typing indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Thinking/)).not.toBeInTheDocument();
      });

      // AI response should be displayed
      await waitFor(() => {
        expect(screen.getByText(/ユーザー認証/)).toBeInTheDocument();
      });

      // Step 6: Generate template
      const generateButton = screen.getByRole('button', { name: /テンプレート生成/ });

      // Mock template generation API call
      mockedApiClient.post.mockResolvedValueOnce({ 
        data: { 
          id: 'template-gen-1',
          sessionId: 'session-e2e-test',
          status: 'generating',
        }
      });

      await user.click(generateButton);

      // Simulate template generation progress
      act(() => {
        mockSocketEvents['ai:template:started']?.[0]?.({
          sessionId: 'session-e2e-test',
          estimatedTime: 30000,
          requirements: {
            count: 5,
            categories: ['goal', 'constraint', 'deliverable'],
          },
        });
      });

      // Show progress indicator
      await waitFor(() => {
        expect(screen.getByText(/要件を分析中/)).toBeInTheDocument();
      });

      // Update progress
      act(() => {
        mockSocketEvents['ai:template:progress']?.[0]?.({
          sessionId: 'session-e2e-test',
          stage: 'generating',
          progress: 50,
          message: 'テンプレートを生成中...',
          details: {
            stepsCompleted: 3,
            totalSteps: 6,
            currentStep: 'ステップ依存関係の設定',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/テンプレートを生成中/)).toBeInTheDocument();
      });

      // Complete template generation
      const generatedTemplate = {
        id: 'template-123',
        sessionId: 'session-e2e-test',
        name: 'MVP開発プロセス',
        description: 'アジャイル開発によるMVP構築のテンプレート',
        steps: [
          {
            id: 'step-1',
            name: '要件定義',
            description: 'ビジネス要件とユーザーストーリーの作成',
            duration: 5,
            dependencies: [],
          },
          {
            id: 'step-2',
            name: '設計',
            description: 'システムアーキテクチャとUI/UX設計',
            duration: 7,
            dependencies: ['step-1'],
          },
          {
            id: 'step-3',
            name: '実装',
            description: 'コア機能の開発',
            duration: 14,
            dependencies: ['step-2'],
          },
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          generationTime: 25000,
          confidence: 0.88,
          sources: ['agile-best-practices', 'mvp-guidelines'],
        },
      };

      act(() => {
        mockSocketEvents['ai:template:completed']?.[0]?.({
          sessionId: 'session-e2e-test',
          templateId: 'template-123',
          template: generatedTemplate,
          statistics: {
            stepsGenerated: 3,
            researchSourcesUsed: 2,
            requirementsIncorporated: 5,
            estimatedProjectDuration: 26,
          },
        });
      });

      // Template should be displayed
      await waitFor(() => {
        expect(screen.getByText('MVP開発プロセス')).toBeInTheDocument();
        expect(screen.getByText(/要件定義/)).toBeInTheDocument();
        expect(screen.getByText(/設計/)).toBeInTheDocument();
        expect(screen.getByText(/実装/)).toBeInTheDocument();
      });

      // Step 7: Approve template
      const approveButton = screen.getByRole('button', { name: /テンプレートを承認/ });

      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          processTemplateId: 'process-template-456',
        },
      });

      await user.click(approveButton);

      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/ai-agent/sessions/session-e2e-test/template/template-123/approve',
          expect.any(Object)
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: expect.stringContaining('承認'),
          })
        );
      });

      // Step 8: End session
      const endButton = screen.getByRole('button', { name: /セッション終了/ });

      mockedApiClient.delete.mockResolvedValueOnce({ data: { success: true } });

      await user.click(endButton);

      await waitFor(() => {
        expect(mockedApiClient.delete).toHaveBeenCalledWith('/ai-agent/sessions/session-e2e-test');
      });

      // Should return to welcome screen
      await waitFor(() => {
        expect(screen.getByText(/プロセステンプレートの作成をAIがサポート/)).toBeInTheDocument();
      });
    });

    it('should handle errors gracefully throughout the flow', async () => {
      // Test error handling in session creation
      mockedApiClient.get.mockResolvedValueOnce({ data: null });

      render(<AIAgentPage />, { wrapper });

      const startButton = await screen.findByRole('button', { name: /新しいセッションを開始/ });

      // Mock API error
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            message: 'サーバーエラーが発生しました',
          },
        },
      });

      await user.click(startButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          title: 'Failed to create session',
          message: 'サーバーエラーが発生しました',
        });
      });

      // Page should remain functional
      expect(startButton).toBeEnabled();
    });

    it('should restore existing session on page load', async () => {
      // Mock existing session
      const existingSession = {
        id: 'existing-session',
        status: SessionStatus.ACTIVE,
        userId: 1,
        context: {
          industry: '既存の業界',
          processType: '既存のプロセス',
          goal: '既存の目標',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingMessages = [
        {
          id: 'existing-msg-1',
          sessionId: 'existing-session',
          content: '以前のメッセージ',
          role: MessageRole.USER,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'existing-msg-2',
          sessionId: 'existing-session',
          content: 'AIからの返答',
          role: MessageRole.ASSISTANT,
          createdAt: new Date().toISOString(),
        },
      ];

      mockedApiClient.get
        .mockResolvedValueOnce({ data: existingSession }) // Current session
        .mockResolvedValueOnce({ data: existingMessages }); // Messages

      render(<AIAgentPage />, { wrapper });

      // Should load existing session
      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/ai-agent/sessions/current');
      });

      // Should display existing messages
      await waitFor(() => {
        expect(screen.getByText('以前のメッセージ')).toBeInTheDocument();
        expect(screen.getByText('AIからの返答')).toBeInTheDocument();
      });

      // Chat interface should be ready
      const messageInput = screen.getByPlaceholderText(/メッセージを入力/);
      expect(messageInput).toBeEnabled();
    });
  });
});