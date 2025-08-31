'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import {
  AI_EVENT_NAMES,
  SendMessageRequest,
  TypingIndicatorRequest,
  JoinSessionRequest,
  LeaveSessionRequest,
  SessionStatusRequest,
  GenerateTemplateRequest,
  CancelTemplateGenerationRequest,
  ApproveTemplateRequest,
} from '../types';

// Constants
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * WebSocket Hook for AI Agent
 * Manages WebSocket connection to AI Agent namespace
 */
export function useAIWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const eventHandlers = useRef<Map<string, Set<Function>>>(new Map());

  /**
   * Connect to AI Agent WebSocket namespace
   */
  const connectToAIAgent = useCallback(() => {
    // Skip if server-side rendering
    if (typeof window === 'undefined') {
      return null;
    }

    // Get authentication token
    const token = Cookies.get('accessToken');
    if (!token) {
      setConnectionError('No authentication token available');
      return null;
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    // Get API URL and derive server URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';
    const serverUrl = apiUrl.replace('/api', '');
    
    // Create new socket connection to AI Agent namespace
    const newSocket = io(`${serverUrl}/ai-agent`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // Manual reconnection management
    });

    // Connection successful
    newSocket.on('connect', () => {
      console.log('AI Agent WebSocket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    // Connection error
    newSocket.on('connect_error', (error: Error) => {
      console.error('AI Agent WebSocket connection error:', error.message);
      setIsConnected(false);
      setConnectionError(error.message);
      
      // Attempt reconnection
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts.current);
        reconnectAttempts.current++;
        
        console.log(`Reconnecting AI Agent in ${delay}ms... (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        
        reconnectTimeout.current = setTimeout(() => {
          connectToAIAgent();
        }, delay);
      }
    });

    // Disconnection
    newSocket.on('disconnect', (reason: string) => {
      console.log('AI Agent WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // Auto-reconnect on server disconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        connectToAIAgent();
      }
    });

    // Set up event forwarding to registered handlers
    Object.values(AI_EVENT_NAMES).forEach((eventName) => {
      newSocket.on(eventName, (data: any) => {
        const handlers = eventHandlers.current.get(eventName);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      });
    });

    setSocket(newSocket);
    return newSocket;
  }, [socket]);

  /**
   * Disconnect from AI Agent WebSocket
   */
  const disconnectFromAIAgent = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  /**
   * Join AI session
   */
  const joinSession = useCallback((sessionId: string) => {
    if (socket && isConnected) {
      const request: JoinSessionRequest = { sessionId };
      socket.emit(AI_EVENT_NAMES.JOIN, request);
    }
  }, [socket, isConnected]);

  /**
   * Leave AI session
   */
  const leaveSession = useCallback((sessionId: string) => {
    if (socket && isConnected) {
      const request: LeaveSessionRequest = { sessionId };
      socket.emit(AI_EVENT_NAMES.LEAVE, request);
    }
  }, [socket, isConnected]);

  /**
   * Send message to AI
   */
  const sendMessage = useCallback((sessionId: string, message: string) => {
    if (socket && isConnected) {
      const request: SendMessageRequest = {
        sessionId,
        message,
        metadata: {
          clientId: socket.id,
          timestamp: new Date().toISOString(),
        },
      };
      socket.emit(AI_EVENT_NAMES.SEND, request);
    }
  }, [socket, isConnected]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback((sessionId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      const request: TypingIndicatorRequest = { sessionId, isTyping };
      socket.emit(AI_EVENT_NAMES.TYPING_INDICATOR, request);
    }
  }, [socket, isConnected]);

  /**
   * Request session status
   */
  const requestSessionStatus = useCallback((sessionId: string) => {
    if (socket && isConnected) {
      const request: SessionStatusRequest = { sessionId };
      socket.emit(AI_EVENT_NAMES.STATUS_REQUEST, request);
    }
  }, [socket, isConnected]);

  /**
   * Generate template
   */
  const generateTemplate = useCallback((sessionId: string, options?: GenerateTemplateRequest['options']) => {
    if (socket && isConnected) {
      const request: GenerateTemplateRequest = { sessionId, options };
      socket.emit(AI_EVENT_NAMES.GENERATE, request);
    }
  }, [socket, isConnected]);

  /**
   * Cancel template generation
   */
  const cancelTemplateGeneration = useCallback((sessionId: string, reason?: string) => {
    if (socket && isConnected) {
      const request: CancelTemplateGenerationRequest = { sessionId, reason };
      socket.emit(AI_EVENT_NAMES.CANCEL, request);
    }
  }, [socket, isConnected]);

  /**
   * Approve template
   */
  const approveTemplate = useCallback((sessionId: string, templateId: string, modifications?: any) => {
    if (socket && isConnected) {
      const request: ApproveTemplateRequest = { sessionId, templateId, modifications };
      socket.emit(AI_EVENT_NAMES.APPROVE, request);
    }
  }, [socket, isConnected]);

  /**
   * Register event handler
   */
  const on = useCallback((event: string, handler: Function) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)?.add(handler);

    // If socket is already connected, register the handler directly
    if (socket) {
      socket.on(event, handler as any);
    }
  }, [socket]);

  /**
   * Unregister event handler
   */
  const off = useCallback((event: string, handler: Function) => {
    eventHandlers.current.get(event)?.delete(handler);

    // If socket is connected, remove the handler
    if (socket) {
      socket.off(event, handler as any);
    }
  }, [socket]);

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    // Only connect on client side
    if (typeof window === 'undefined') {
      return;
    }

    const newSocket = connectToAIAgent();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online - reconnecting AI Agent WebSocket');
      if (!isConnected) {
        connectToAIAgent();
      }
    };

    const handleOffline = () => {
      console.log('Network offline');
      setConnectionError('Network offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, connectToAIAgent]);

  /**
   * Handle page visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('Page became visible - checking AI Agent WebSocket connection');
        connectToAIAgent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, connectToAIAgent]);

  return {
    // Connection state
    socket,
    isConnected,
    connectionError,
    
    // Connection management
    connectToAIAgent,
    disconnectFromAIAgent,
    
    // Session operations
    joinSession,
    leaveSession,
    requestSessionStatus,
    
    // Message operations
    sendMessage,
    sendTypingIndicator,
    
    // Template operations
    generateTemplate,
    cancelTemplateGeneration,
    approveTemplate,
    
    // Event handling
    on,
    off,
  };
}