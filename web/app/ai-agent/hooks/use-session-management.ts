'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/app/lib/api-client';
import { useToast } from '@/app/components/ui/toast';
import { useAIWebSocket } from './use-websocket';
import {
  AISession,
  SessionStatus,
  SessionContext,
  AISessionCreatedEvent,
  AISessionStatusChangedEvent,
  AISessionEndedEvent,
  AISessionExpiredEvent,
  SESSION_EVENTS,
} from '../types';

/**
 * Session Management Hook
 * Manages AI session lifecycle and state
 */
export function useSessionManagement() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { 
    isConnected, 
    joinSession: wsJoinSession, 
    leaveSession: wsLeaveSession,
    requestSessionStatus,
    on,
    off,
  } = useAIWebSocket();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);

  /**
   * Get session by ID
   */
  const { 
    data: currentSession, 
    isLoading: isLoadingSession,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['ai-session', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return null;
      const { data } = await apiClient.get(`/ai-agent/sessions/${currentSessionId}`);
      return data as AISession;
    },
    enabled: !!currentSessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  /**
   * Create new session
   */
  const createSessionMutation = useMutation({
    mutationFn: async (context: SessionContext) => {
      const { data } = await apiClient.post('/ai-agent/sessions', { context });
      return data as AISession;
    },
    onSuccess: (session) => {
      // Update state
      setCurrentSessionId(session.id);
      setSessionStatus(session.status);
      
      // Cache the session
      queryClient.setQueryData(['ai-session', session.id], session);
      
      // Join WebSocket room
      if (isConnected) {
        wsJoinSession(session.id);
      }
      
      addToast({ 
        type: 'success', 
        title: 'AI session started',
        message: 'You can now start chatting with the AI assistant.',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to create session',
        message: error.response?.data?.message || 'Please try again later.',
      });
    },
  });

  /**
   * End current session
   */
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(`/ai-agent/sessions/${sessionId}`);
    },
    onSuccess: (_, sessionId) => {
      // Leave WebSocket room
      if (isConnected) {
        wsLeaveSession(sessionId);
      }
      
      // Clear state
      setCurrentSessionId(null);
      setSessionStatus(null);
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['ai-session', sessionId] });
      queryClient.removeQueries({ queryKey: ['ai-messages', sessionId] });
      
      addToast({ 
        type: 'info', 
        title: 'Session ended',
        message: 'Your AI session has been ended.',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to end session',
        message: error.response?.data?.message || 'Please try again.',
      });
    },
  });

  /**
   * Update session status
   */
  const updateSessionStatusMutation = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: SessionStatus }) => {
      const { data } = await apiClient.patch(`/ai-agent/sessions/${sessionId}/status`, { status });
      return data as AISession;
    },
    onSuccess: (session) => {
      setSessionStatus(session.status);
      queryClient.setQueryData(['ai-session', session.id], session);
      
      addToast({ 
        type: 'success', 
        title: 'Session status updated',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to update session status',
        message: error.response?.data?.message || 'Please try again.',
      });
    },
  });

  /**
   * Create a new session
   */
  const createSession = useCallback((context: SessionContext) => {
    return createSessionMutation.mutate(context);
  }, [createSessionMutation]);

  /**
   * Get session information
   */
  const getSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    return refetchSession();
  }, [refetchSession]);

  /**
   * End the current session
   */
  const endSession = useCallback((sessionId?: string) => {
    const id = sessionId || currentSessionId;
    if (!id) {
      addToast({
        type: 'error',
        title: 'No active session',
        message: 'There is no active session to end.',
      });
      return;
    }
    return endSessionMutation.mutate(id);
  }, [currentSessionId, endSessionMutation, addToast]);

  /**
   * Update session status
   */
  const updateSessionStatus = useCallback((status: SessionStatus, sessionId?: string) => {
    const id = sessionId || currentSessionId;
    if (!id) {
      addToast({
        type: 'error',
        title: 'No active session',
        message: 'There is no active session to update.',
      });
      return;
    }
    return updateSessionStatusMutation.mutate({ sessionId: id, status });
  }, [currentSessionId, updateSessionStatusMutation, addToast]);

  /**
   * Handle WebSocket events
   */
  useEffect(() => {
    // Session created event
    const handleSessionCreated = (event: AISessionCreatedEvent) => {
      if (event.sessionId === currentSessionId) {
        queryClient.invalidateQueries({ queryKey: ['ai-session', event.sessionId] });
        
        if (event.welcomeMessage) {
          addToast({
            type: 'info',
            title: 'AI Assistant',
            message: event.welcomeMessage,
          });
        }
      }
    };

    // Session status changed event
    const handleStatusChanged = (event: AISessionStatusChangedEvent) => {
      if (event.sessionId === currentSessionId) {
        setSessionStatus(event.newStatus);
        queryClient.setQueryData(['ai-session', event.sessionId], (old: AISession | undefined) => {
          if (!old) return old;
          return { ...old, status: event.newStatus };
        });
      }
    };

    // Session ended event
    const handleSessionEnded = (event: AISessionEndedEvent) => {
      if (event.sessionId === currentSessionId) {
        setCurrentSessionId(null);
        setSessionStatus(null);
        queryClient.removeQueries({ queryKey: ['ai-session', event.sessionId] });
        
        let message = 'Your session has ended.';
        if (event.summary) {
          message = `Session ended. Messages: ${event.summary.messagesCount}, Requirements: ${event.summary.requirementsExtracted}`;
        }
        
        addToast({
          type: event.reason === 'completed' ? 'success' : 'info',
          title: 'Session ended',
          message,
        });
      }
    };

    // Session expired event
    const handleSessionExpired = (event: AISessionExpiredEvent) => {
      if (event.sessionId === currentSessionId) {
        setCurrentSessionId(null);
        setSessionStatus(SessionStatus.EXPIRED);
        queryClient.removeQueries({ queryKey: ['ai-session', event.sessionId] });
        
        addToast({
          type: 'warning',
          title: 'Session expired',
          message: event.expirationReason === 'inactivity' 
            ? 'Your session expired due to inactivity.'
            : 'Your session has expired.',
        });
      }
    };

    // Register event handlers
    on(SESSION_EVENTS.CREATED, handleSessionCreated);
    on(SESSION_EVENTS.STATUS_CHANGED, handleStatusChanged);
    on(SESSION_EVENTS.ENDED, handleSessionEnded);
    on(SESSION_EVENTS.EXPIRED, handleSessionExpired);

    // Cleanup
    return () => {
      off(SESSION_EVENTS.CREATED, handleSessionCreated);
      off(SESSION_EVENTS.STATUS_CHANGED, handleStatusChanged);
      off(SESSION_EVENTS.ENDED, handleSessionEnded);
      off(SESSION_EVENTS.EXPIRED, handleSessionExpired);
    };
  }, [currentSessionId, on, off, queryClient, addToast]);

  /**
   * Auto-join session on WebSocket connection
   */
  useEffect(() => {
    if (isConnected && currentSessionId) {
      wsJoinSession(currentSessionId);
      requestSessionStatus(currentSessionId);
    }
  }, [isConnected, currentSessionId, wsJoinSession, requestSessionStatus]);

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data } = await apiClient.get('/ai-agent/sessions/current');
        if (data && data.id) {
          setCurrentSessionId(data.id);
          setSessionStatus(data.status);
          queryClient.setQueryData(['ai-session', data.id], data);
        }
      } catch (error) {
        // No existing session or error - ignore
        console.log('No existing AI session found');
      }
    };

    checkExistingSession();
  }, [queryClient]);

  return {
    // Session state
    currentSession,
    currentSessionId,
    sessionStatus,
    isLoading: isLoadingSession || createSessionMutation.isPending || endSessionMutation.isPending,
    error: sessionError || createSessionMutation.error || endSessionMutation.error,
    
    // Session operations
    createSession,
    getSession,
    endSession,
    updateSessionStatus,
    
    // Mutation states
    isCreating: createSessionMutation.isPending,
    isEnding: endSessionMutation.isPending,
    isUpdating: updateSessionStatusMutation.isPending,
  };
}