/**
 * Session Management Hook Integration Test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSessionManagement } from '../use-session-management';
import { apiClient } from '../../../../lib/api-client';
import { SessionStatus } from '../../types';

// Mock dependencies
jest.mock('../../../../lib/api-client');
jest.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

jest.mock('../use-websocket', () => ({
  useAIWebSocket: () => ({
    isConnected: true,
    joinSession: jest.fn(),
    leaveSession: jest.fn(),
    requestSessionStatus: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useSessionManagement Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Initial State', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      expect(result.current.isIdle).toBe(true);
      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.sessionStatus).toBeNull();
      expect(result.current.currentSession).toBeNull();
    });

    it('should check for existing session on mount', async () => {
      const mockSession = {
        id: 'existing-session-123',
        status: SessionStatus.ACTIVE,
        userId: 1,
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockSession });

      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/ai-agent/sessions/current');
      });

      await waitFor(() => {
        expect(result.current.currentSessionId).toBe('existing-session-123');
        expect(result.current.sessionStatus).toBe(SessionStatus.ACTIVE);
        expect(result.current.isIdle).toBe(false);
      });
    });
  });

  describe('Create Session', () => {
    it('should create a new session with correct parameters', async () => {
      const mockResponse = {
        sessionId: 'new-session-456',
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

      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      await act(async () => {
        result.current.createSession({
          industry: 'Technology',
          processType: 'Software Development',
          goal: 'Build MVP',
        });
      });

      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith('/api/ai-agent/sessions', {
          industry: 'Technology',
          processType: 'Software Development',
          goal: 'Build MVP',
        });
      });

      await waitFor(() => {
        expect(result.current.currentSessionId).toBe('new-session-456');
        expect(result.current.sessionStatus).toBe(SessionStatus.ACTIVE);
        expect(result.current.isIdle).toBe(false);
      });
    });

    it('should handle creation error and reset to idle', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to create session',
          },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      await act(async () => {
        result.current.createSession({
          industry: 'Technology',
          processType: 'Software Development',
          goal: 'Build MVP',
        });
      });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
        expect(result.current.currentSessionId).toBeNull();
      });
    });
  });

  describe('End Session', () => {
    it('should end current session successfully', async () => {
      // Setup initial session
      const mockSession = {
        id: 'session-to-end',
        sessionId: 'session-to-end',
        status: SessionStatus.ACTIVE,
        userId: 1,
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockSession });
      mockedApiClient.delete.mockResolvedValueOnce({});

      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      // Create session first
      await act(async () => {
        result.current.createSession({
          industry: 'Tech',
          processType: 'Dev',
          goal: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.currentSessionId).toBe('session-to-end');
      });

      // End session
      await act(async () => {
        result.current.endSession();
      });

      await waitFor(() => {
        expect(mockedApiClient.delete).toHaveBeenCalledWith('/ai-agent/sessions/session-to-end');
      });

      await waitFor(() => {
        expect(result.current.currentSessionId).toBeNull();
        expect(result.current.sessionStatus).toBeNull();
        expect(result.current.isIdle).toBe(true);
      });
    });
  });

  describe('Update Session Status', () => {
    it('should update session status', async () => {
      const mockSession = {
        id: 'session-to-update',
        sessionId: 'session-to-update',
        status: SessionStatus.ACTIVE,
        userId: 1,
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedSession = {
        ...mockSession,
        status: SessionStatus.PAUSED,
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockSession });
      mockedApiClient.patch.mockResolvedValueOnce({ data: updatedSession });

      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      // Create session first
      await act(async () => {
        result.current.createSession({
          industry: 'Tech',
          processType: 'Dev',
          goal: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.sessionStatus).toBe(SessionStatus.ACTIVE);
      });

      // Update status
      await act(async () => {
        result.current.updateSessionStatus(SessionStatus.PAUSED);
      });

      await waitFor(() => {
        expect(mockedApiClient.patch).toHaveBeenCalledWith(
          '/ai-agent/sessions/session-to-update/status',
          { status: SessionStatus.PAUSED }
        );
      });

      await waitFor(() => {
        expect(result.current.sessionStatus).toBe(SessionStatus.PAUSED);
      });
    });
  });

  describe('Loading States', () => {
    it('should track loading states correctly', async () => {
      const mockSession = {
        sessionId: 'loading-test',
        status: SessionStatus.ACTIVE,
        userId: 1,
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Delay the response to test loading state
      mockedApiClient.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockSession }), 100))
      );

      const { result } = renderHook(() => useSessionManagement(), { wrapper });

      expect(result.current.isCreating).toBe(false);

      act(() => {
        result.current.createSession({
          industry: 'Tech',
          processType: 'Dev',
          goal: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      }, { timeout: 200 });
    });
  });
});