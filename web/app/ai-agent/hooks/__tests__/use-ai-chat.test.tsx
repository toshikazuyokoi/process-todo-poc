/**
 * AI Chat Hook Integration Test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAIChat } from '../use-ai-chat';
import { apiClient } from '../../../../lib/api-client';
import { MessageRole, AIMessage, MESSAGE_EVENTS } from '../../types';

// Mock dependencies
jest.mock('../../../../lib/api-client');
jest.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

// WebSocket mock
const mockWsCallbacks: { [key: string]: Function[] } = {};
const mockWebSocket = {
  isConnected: true,
  sendMessage: jest.fn(),
  sendTypingIndicator: jest.fn(),
  on: jest.fn((event: string, callback: Function) => {
    if (!mockWsCallbacks[event]) {
      mockWsCallbacks[event] = [];
    }
    mockWsCallbacks[event].push(callback);
  }),
  off: jest.fn((event: string, callback: Function) => {
    if (mockWsCallbacks[event]) {
      mockWsCallbacks[event] = mockWsCallbacks[event].filter(cb => cb !== callback);
    }
  }),
};

jest.mock('../use-websocket', () => ({
  useAIWebSocket: () => mockWebSocket,
}));

jest.mock('../use-session-management', () => ({
  useSessionManagement: () => ({
    currentSessionId: 'test-session-123',
  }),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useAIChat Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    // Clear mock callbacks
    Object.keys(mockWsCallbacks).forEach(key => {
      mockWsCallbacks[key] = [];
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Message Loading', () => {
    it('should load messages for active session', async () => {
      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'test-session-123',
          content: 'Hello AI',
          role: MessageRole.USER,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          sessionId: 'test-session-123',
          content: 'Hello! How can I help you?',
          role: MessageRole.ASSISTANT,
          createdAt: new Date().toISOString(),
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockMessages });

      const { result } = renderHook(() => useAIChat(), { wrapper });

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/ai-agent/sessions/test-session-123/messages');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hello AI');
        expect(result.current.messages[1].content).toBe('Hello! How can I help you?');
      });
    });

    it('should return empty array when no session', async () => {
      // Override the mock for this test
      jest.resetModules();
      jest.doMock('../use-session-management', () => ({
        useSessionManagement: () => ({
          currentSessionId: null,
        }),
      }));

      const { useAIChat: useAIChatNoSession } = require('../use-ai-chat');
      const { result } = renderHook(() => useAIChatNoSession(), { wrapper });

      expect(result.current.messages).toEqual([]);
      expect(result.current.activeSessionId).toBeNull();
    });
  });

  describe('Send Message', () => {
    it('should send message via WebSocket and API', async () => {
      const mockMessage: AIMessage = {
        id: 'msg-3',
        sessionId: 'test-session-123',
        content: 'Test message',
        role: MessageRole.USER,
        createdAt: new Date().toISOString(),
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockMessage });
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useAIChat(), { wrapper });

      await act(async () => {
        result.current.sendMessage('Test message');
      });

      // Check WebSocket call
      expect(mockWebSocket.sendMessage).toHaveBeenCalledWith('test-session-123', 'Test message');

      // Check API call
      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/ai-agent/sessions/test-session-123/messages',
          {
            content: 'Test message',
            role: MessageRole.USER,
          }
        );
      });

      // Check optimistic update
      await waitFor(() => {
        const userMessage = result.current.messages.find(m => m.content === 'Test message');
        expect(userMessage).toBeDefined();
        expect(userMessage?.role).toBe(MessageRole.USER);
      });
    });

    it('should not send empty messages', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });
      const { result } = renderHook(() => useAIChat(), { wrapper });

      await act(async () => {
        result.current.sendMessage('   ');
      });

      expect(mockWebSocket.sendMessage).not.toHaveBeenCalled();
      expect(mockedApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Typing Indicators', () => {
    it('should handle user typing indicator', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });
      const { result } = renderHook(() => useAIChat(), { wrapper });

      act(() => {
        result.current.handleUserTyping(true);
      });

      expect(mockWebSocket.sendTypingIndicator).toHaveBeenCalledWith('test-session-123', true);
      expect(result.current.userTyping).toBe(true);

      // Should auto-stop after timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 3100));
      });

      expect(result.current.userTyping).toBe(false);
    });

    it('should handle AI typing indicator from WebSocket', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });
      const { result } = renderHook(() => useAIChat(), { wrapper });

      // Simulate WebSocket event
      act(() => {
        const typingEvent = {
          sessionId: 'test-session-123',
          isTyping: true,
          stage: 'thinking',
          estimatedTime: 5000,
        };
        mockWsCallbacks[MESSAGE_EVENTS.TYPING]?.[0]?.(typingEvent);
      });

      expect(result.current.isAITyping).toBe(true);
      expect(result.current.aiTypingStage).toBe('thinking');
      expect(result.current.estimatedTime).toBe(5000);

      // Stop typing
      act(() => {
        const typingEvent = {
          sessionId: 'test-session-123',
          isTyping: false,
        };
        mockWsCallbacks[MESSAGE_EVENTS.TYPING]?.[0]?.(typingEvent);
      });

      expect(result.current.isAITyping).toBe(false);
      expect(result.current.aiTypingStage).toBeUndefined();
    });
  });

  describe('WebSocket Events', () => {
    it('should handle message received event', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });
      const { result } = renderHook(() => useAIChat(), { wrapper });

      // Simulate receiving a message via WebSocket
      act(() => {
        const messageEvent = {
          sessionId: 'test-session-123',
          messageId: 'ws-msg-1',
          content: 'AI response',
          role: MessageRole.ASSISTANT,
          metadata: {
            tokenCount: 50,
            processingTime: 1000,
          },
        };
        mockWsCallbacks[MESSAGE_EVENTS.RECEIVED]?.[0]?.(messageEvent);
      });

      await waitFor(() => {
        const aiMessage = result.current.messages.find(m => m.id === 'ws-msg-1');
        expect(aiMessage).toBeDefined();
        expect(aiMessage?.content).toBe('AI response');
        expect(aiMessage?.role).toBe(MessageRole.ASSISTANT);
        expect(aiMessage?.metadata?.tokenCount).toBe(50);
      });

      // Should stop typing indicator
      expect(result.current.isAITyping).toBe(false);
    });

    it('should handle message error event', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });
      const { result } = renderHook(() => useAIChat(), { wrapper });

      // Start typing
      act(() => {
        const typingEvent = {
          sessionId: 'test-session-123',
          isTyping: true,
        };
        mockWsCallbacks[MESSAGE_EVENTS.TYPING]?.[0]?.(typingEvent);
      });

      expect(result.current.isAITyping).toBe(true);

      // Simulate error
      act(() => {
        const errorEvent = {
          sessionId: 'test-session-123',
          error: {
            code: 'MSG_ERROR',
            message: 'Failed to process message',
          },
          retryable: true,
        };
        mockWsCallbacks[MESSAGE_EVENTS.ERROR]?.[0]?.(errorEvent);
      });

      // Should stop typing on error
      expect(result.current.isAITyping).toBe(false);
    });

    it('should handle requirements extracted event', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });
      const { result } = renderHook(() => useAIChat(), { wrapper });

      act(() => {
        const requirementsEvent = {
          sessionId: 'test-session-123',
          requirements: [
            {
              id: 'req-1',
              category: 'goal',
              content: 'Build MVP',
              priority: 'high',
              confidence: 0.9,
            },
          ],
          totalCount: 1,
          newCount: 1,
          updatedCount: 0,
        };
        mockWsCallbacks[MESSAGE_EVENTS.REQUIREMENTS_EXTRACTED]?.[0]?.(requirementsEvent);
      });

      // Should invalidate requirements query
      await waitFor(() => {
        const invalidatedQueries = queryClient.getQueryCache().findAll({
          queryKey: ['ai-requirements', 'test-session-123'],
        });
        expect(invalidatedQueries).toBeDefined();
      });
    });
  });

  describe('Clear Messages', () => {
    it('should clear all messages', async () => {
      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'test-session-123',
          content: 'Message to clear',
          role: MessageRole.USER,
          createdAt: new Date().toISOString(),
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockMessages });

      const { result } = renderHook(() => useAIChat(), { wrapper });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });
});