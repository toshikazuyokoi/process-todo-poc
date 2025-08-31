'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/app/lib/api-client';
import { useToast } from '@/app/components/ui/toast';
import { useAIWebSocket } from './use-websocket';
import { useSessionManagement } from './use-session-management';
import {
  AIMessage,
  MessageRole,
  AIMessageReceivedEvent,
  AIMessageTypingEvent,
  AIMessageErrorEvent,
  AIRequirementsExtractedEvent,
  MESSAGE_EVENTS,
} from '../types';

/**
 * AI Chat Management Hook
 * Manages chat messages, typing states, and real-time updates
 */
export function useAIChat(sessionId?: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { 
    isConnected,
    sendMessage: wsSendMessage,
    sendTypingIndicator,
    on,
    off,
  } = useAIWebSocket();
  const { currentSessionId } = useSessionManagement();

  // Use provided sessionId or current session
  const activeSessionId = sessionId || currentSessionId;

  // Local state
  const [isAITyping, setIsAITyping] = useState(false);
  const [aiTypingStage, setAITypingStage] = useState<string | undefined>();
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>();
  const [userTyping, setUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch message history
   */
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['ai-messages', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return [];
      const { data } = await apiClient.get(`/ai-agent/sessions/${activeSessionId}/messages`);
      return data as AIMessage[];
    },
    enabled: !!activeSessionId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  /**
   * Send message mutation
   */
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!activeSessionId) {
        throw new Error('No active session');
      }

      // Send via WebSocket (real-time)
      if (isConnected) {
        wsSendMessage(activeSessionId, message);
      }

      // Also save via API for persistence
      const { data } = await apiClient.post(`/ai-agent/sessions/${activeSessionId}/messages`, {
        content: message,
        role: MessageRole.USER,
      });
      return data as AIMessage;
    },
    onMutate: async (message) => {
      // Optimistic update
      const tempMessage: AIMessage = {
        id: `temp-${Date.now()}`,
        sessionId: activeSessionId!,
        content: message,
        role: MessageRole.USER,
        createdAt: new Date().toISOString(),
      };

      await queryClient.cancelQueries({ queryKey: ['ai-messages', activeSessionId] });
      const previousMessages = queryClient.getQueryData<AIMessage[]>(['ai-messages', activeSessionId]);

      queryClient.setQueryData<AIMessage[]>(
        ['ai-messages', activeSessionId],
        (old = []) => [...old, tempMessage]
      );

      return { previousMessages, tempMessage };
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['ai-messages', activeSessionId], context.previousMessages);
      }

      addToast({
        type: 'error',
        title: error.response?.data?.message || 'Failed to send message',
      });
    },
    onSuccess: (data, _, context) => {
      // Replace temp message with real one
      queryClient.setQueryData<AIMessage[]>(
        ['ai-messages', activeSessionId],
        (old = []) => old.map(msg => 
          msg.id === context?.tempMessage.id ? data : msg
        )
      );
    },
  });

  /**
   * Send a message
   */
  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) return;
    if (!activeSessionId) {
      addToast({
        type: 'error',
        title: 'No active session',
        message: 'Please start a session first',
      });
      return;
    }

    return sendMessageMutation.mutate(message);
  }, [activeSessionId, sendMessageMutation, addToast]);

  /**
   * Handle user typing
   */
  const handleUserTyping = useCallback((isTyping: boolean) => {
    if (!activeSessionId || !isConnected) return;

    setUserTyping(isTyping);
    sendTypingIndicator(activeSessionId, isTyping);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setUserTyping(false);
        sendTypingIndicator(activeSessionId, false);
      }, 3000);
    }
  }, [activeSessionId, isConnected, sendTypingIndicator]);

  /**
   * Handle WebSocket events
   */
  useEffect(() => {
    if (!activeSessionId) return;

    // Message received
    const handleMessageReceived = (event: AIMessageReceivedEvent) => {
      if (event.sessionId !== activeSessionId) return;

      const newMessage: AIMessage = {
        id: event.messageId,
        sessionId: event.sessionId,
        content: event.content,
        role: event.role,
        createdAt: new Date().toISOString(),
        metadata: event.metadata,
      };

      queryClient.setQueryData<AIMessage[]>(
        ['ai-messages', activeSessionId],
        (old = []) => [...old, newMessage]
      );

      // Stop typing indicator
      setIsAITyping(false);
      setAITypingStage(undefined);
      setEstimatedTime(undefined);
    };

    // Typing indicator
    const handleTyping = (event: AIMessageTypingEvent) => {
      if (event.sessionId !== activeSessionId) return;

      setIsAITyping(event.isTyping);
      setAITypingStage(event.stage);
      setEstimatedTime(event.estimatedTime);
    };

    // Message error
    const handleMessageError = (event: AIMessageErrorEvent) => {
      if (event.sessionId !== activeSessionId) return;

      addToast({
        type: 'error',
        title: 'Message error',
        message: event.error.message,
      });

      // Stop typing indicator
      setIsAITyping(false);
      setAITypingStage(undefined);
      setEstimatedTime(undefined);
    };

    // Requirements extracted
    const handleRequirementsExtracted = (event: AIRequirementsExtractedEvent) => {
      if (event.sessionId !== activeSessionId) return;

      // Invalidate requirements query if exists
      queryClient.invalidateQueries({ queryKey: ['ai-requirements', activeSessionId] });

      if (event.newCount > 0) {
        addToast({
          type: 'info',
          title: `${event.newCount} new requirements extracted`,
        });
      }
    };

    // Register event handlers
    on(MESSAGE_EVENTS.RECEIVED, handleMessageReceived);
    on(MESSAGE_EVENTS.TYPING, handleTyping);
    on(MESSAGE_EVENTS.ERROR, handleMessageError);
    on(MESSAGE_EVENTS.REQUIREMENTS_EXTRACTED, handleRequirementsExtracted);

    // Cleanup
    return () => {
      off(MESSAGE_EVENTS.RECEIVED, handleMessageReceived);
      off(MESSAGE_EVENTS.TYPING, handleTyping);
      off(MESSAGE_EVENTS.ERROR, handleMessageError);
      off(MESSAGE_EVENTS.REQUIREMENTS_EXTRACTED, handleRequirementsExtracted);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeSessionId, on, off, queryClient, addToast]);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    if (!activeSessionId) return;
    queryClient.setQueryData(['ai-messages', activeSessionId], []);
  }, [activeSessionId, queryClient]);

  return {
    // Messages
    messages,
    isLoadingMessages,
    messagesError,
    refetchMessages,
    clearMessages,

    // Send message
    sendMessage,
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,

    // Typing states
    isAITyping,
    aiTypingStage,
    estimatedTime,
    userTyping,
    handleUserTyping,

    // Session
    activeSessionId,
    isConnected,
  };
}