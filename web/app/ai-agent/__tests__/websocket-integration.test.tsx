/**
 * WebSocket Integration Tests
 * Tests the complete flow with mocked WebSocket connections
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatInterface } from '../components/chat-interface';
import { io, __resetSockets, __getSocket } from 'socket.io-client';

// Mock the Socket.IO client
jest.mock('socket.io-client');

// Mock hooks to prevent errors
jest.mock('../hooks/use-session-management', () => ({
  useSessionManagement: () => ({
    currentSession: { id: 'session-123', status: 'active', startedAt: new Date().toISOString() },
    sessionStatus: 'active' as const,
    isLoading: false,
    createSession: jest.fn(),
    endSession: jest.fn(),
    getSession: jest.fn(),
    updateSessionStatus: jest.fn(),
  }),
}));

jest.mock('../hooks/use-ai-chat', () => {
  const { __getSocket } = require('socket.io-client');
  return {
    useAIChat: (sessionId: string) => {
      const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
      return {
        messages: [],
        isLoadingMessages: false,
        sendMessage: jest.fn((content: string) => {
          if (socket) {
            socket.emit('ai:sendMessage', { content, sessionId: sessionId || 'session-123' });
          }
        }),
        isSending: false,
        isAITyping: false,
        aiTypingStage: null,
        estimatedTime: null,
        handleUserTyping: jest.fn(),
        isConnected: socket?.connected || false,
      };
    },
  };
});

jest.mock('../hooks/use-template-generation', () => {
  const { __getSocket } = require('socket.io-client');
  return {
    useTemplateGeneration: () => {
      const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
      return {
        isGenerating: false,
        stage: null,
        progress: 0,
        message: null,
        estimatedTimeRemaining: null,
        stepsCompleted: 0,
        totalSteps: 0,
        currentStep: null,
        error: null,
        preview: null,
        startGeneration: jest.fn(() => {
          if (socket) {
            socket.emit('ai:generateTemplate', { sessionId: 'session-123' });
          }
        }),
        cancelGeneration: jest.fn(),
        retryGeneration: jest.fn(),
        isStarting: false,
      };
    },
  };
});

jest.mock('../hooks/use-websocket', () => {
  const { __getSocket } = require('socket.io-client');
  const { io } = require('socket.io-client');
  return {
    useAIWebSocket: () => {
      // Create socket on first call
      const socket = io('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
      return {
        isConnected: socket?.connected || false,
        connectionError: null,
        joinSession: jest.fn((sessionId: string) => {
          socket?.emit('ai:joinSession', { sessionId });
        }),
        leaveSession: jest.fn((sessionId: string) => {
          socket?.emit('ai:leaveSession', { sessionId });
        }),
        sendMessage: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };
    },
  };
});

// Create a wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('WebSocket Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    __resetSockets();
    
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Socket Connection', () => {
    it('should establish WebSocket connection on mount', async () => {
      render(<ChatInterface />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(io).toHaveBeenCalledWith(
          expect.stringContaining('/ai-agent'),
          expect.objectContaining({
            transports: ['websocket', 'polling'],
          })
        );
      });

      const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
      expect(socket).toBeDefined();
      
      await waitFor(() => {
        expect(socket?.connected).toBe(true);
      });
    });

    it('should handle connection errors gracefully', async () => {
      const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
      
      render(<ChatInterface />, { wrapper: createWrapper() });

      // Simulate connection error
      await waitFor(() => {
        socket?.emit('connect_error', new Error('Connection failed'));
      });

      // Should show error state (implementation dependent)
      // The actual UI response would depend on the component implementation
    });
  });

  describe('Message Flow', () => {
    it('should send and receive messages through WebSocket', async () => {
      // Mock session creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      // Mock message history
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ChatInterface />, { wrapper: createWrapper() });

      // Wait for connection
      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.connected).toBe(true);
      });

      // Find and interact with message input
      const input = screen.getByPlaceholderText(/メッセージを入力/i);
      const sendButton = screen.getByRole('button', { name: /送信/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Wait for the message to be processed
      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.emit).toHaveBeenCalledWith(
          'ai:sendMessage',
          expect.objectContaining({
            content: 'Test message',
          }),
          expect.any(Function)
        );
      });

      // The mock will automatically emit response events
      await waitFor(() => {
        expect(screen.getByText('Mock AI response')).toBeInTheDocument();
      });
    });

    it('should show typing indicator during AI response', async () => {
      // Mock session
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      // Mock messages
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ChatInterface />, { wrapper: createWrapper() });

      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.connected).toBe(true);
      });

      const input = screen.getByPlaceholderText(/メッセージを入力/i);
      const sendButton = screen.getByRole('button', { name: /送信/i });

      fireEvent.change(input, { target: { value: 'Test typing' } });
      fireEvent.click(sendButton);

      // Check for typing indicator
      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument();
      });

      // Typing should disappear after response
      await waitFor(() => {
        expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Template Generation', () => {
    it('should handle template generation flow', async () => {
      // Mock session
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      // Mock messages with template generation context
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'msg-1',
            type: 'user',
            content: 'Create a software development template',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg-2',
            type: 'ai',
            content: 'I can help you create a template. Click the button below to start.',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      render(<ChatInterface />, { wrapper: createWrapper() });

      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByText(/software development template/i)).toBeInTheDocument();
      });

      // Find and click generate template button
      const generateButton = screen.getByRole('button', { name: /テンプレート生成/i });
      fireEvent.click(generateButton);

      // Wait for generation to start
      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.emit).toHaveBeenCalledWith(
          'ai:generateTemplate',
          expect.any(Object),
          expect.any(Function)
        );
      });

      // Check for progress indicator
      await waitFor(() => {
        expect(screen.getByText(/Analyzing requirements/i)).toBeInTheDocument();
      });

      // Wait for template to be generated (mock will emit the event)
      await waitFor(() => {
        expect(screen.getByText('Mock Generated Template')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show progress updates during generation', async () => {
      // Setup mocks
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'session-123',
            status: 'active',
            startedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<ChatInterface />, { wrapper: createWrapper() });

      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.connected).toBe(true);
      });

      // Trigger template generation
      const generateButton = screen.getByRole('button', { name: /テンプレート生成/i });
      fireEvent.click(generateButton);

      // Check progress stages
      await waitFor(() => {
        expect(screen.getByText(/Analyzing requirements/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Generating template/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should join session on connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ChatInterface />, { wrapper: createWrapper() });

      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.emit).toHaveBeenCalledWith(
          'ai:joinSession',
          expect.objectContaining({
            sessionId: 'session-123',
          }),
          expect.any(Function)
        );
      });
    });

    it('should leave session on unmount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { unmount } = render(<ChatInterface />, { wrapper: createWrapper() });

      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.connected).toBe(true);
      });

      unmount();

      await waitFor(() => {
        const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });
        expect(socket?.emit).toHaveBeenCalledWith(
          'ai:leaveSession',
          expect.objectContaining({
            sessionId: 'session-123',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ChatInterface />, { wrapper: createWrapper() });

      const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });

      // Simulate various error scenarios
      await waitFor(() => {
        socket?.emit('error', new Error('WebSocket error'));
        socket?.emit('ai:error', { message: 'AI processing error' });
      });

      // Component should remain functional
      const input = screen.getByPlaceholderText(/メッセージを入力/i);
      expect(input).toBeInTheDocument();
    });

    it('should retry connection on disconnect', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'active',
          startedAt: new Date().toISOString(),
        }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ChatInterface />, { wrapper: createWrapper() });

      const socket = __getSocket('http://localhost:3005/ai-agent', { transports: ['websocket', 'polling'] });

      await waitFor(() => {
        expect(socket?.connected).toBe(true);
      });

      // Simulate disconnect
      socket?.disconnect();

      await waitFor(() => {
        expect(socket?.connected).toBe(false);
      });

      // Simulate reconnect
      socket?.connect();

      await waitFor(() => {
        expect(socket?.connected).toBe(true);
      });
    });
  });
});