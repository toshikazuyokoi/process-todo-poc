'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  joinCaseRoom: (caseId: number) => void;
  leaveCaseRoom: (caseId: number) => void;
  sendCaseUpdate: (caseId: number, data: any) => void;
  sendStepUpdate: (caseId: number, stepId: number, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
  joinCaseRoom: () => {},
  leaveCaseRoom: () => {},
  sendCaseUpdate: () => {},
  sendStepUpdate: () => {},
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // サーバーサイドレンダリング時はスキップ
    if (typeof window === 'undefined') {
      return null;
    }
    
    // socket.io-clientを動的インポート
    const { io } = require('socket.io-client');
    
    // 既存の接続があれば切断
    if (socket) {
      socket.disconnect();
    }

    // APIのURLからベースURLを取得（/apiを除外）
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';
    const serverUrl = apiUrl.replace('/api', '');
    const newSocket = io(`${serverUrl}/realtime`, {
      auth: {
        token: 'dummy-token', // TODO: 実際の認証トークンを使用
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // 手動で再接続を管理
    });

    // 接続成功
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    // 接続失敗
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setIsConnected(false);
      setConnectionError(error.message);
      
      // 再接続試行
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts.current);
        reconnectAttempts.current++;
        
        console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, delay);
      }
    });

    // 切断
    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // サーバー側からの切断の場合、自動再接続
      if (reason === 'io server disconnect' || reason === 'transport close') {
        connect();
      }
    });

    // サーバーからの接続確認
    newSocket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });

    setSocket(newSocket);
    return newSocket;
  }, [socket]);

  // 初回接続
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      return;
    }
    
    const newSocket = connect();

    // クリーンアップ
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ケースルームに参加
  const joinCaseRoom = useCallback((caseId: number) => {
    if (socket && isConnected) {
      socket.emit('join-case-room', { caseId });
      
      // 参加確認リスナー（一度だけ）
      socket.once('joined-room', (data) => {
        console.log('Joined case room:', data);
      });
    }
  }, [socket, isConnected]);

  // ケースルームから退出
  const leaveCaseRoom = useCallback((caseId: number) => {
    if (socket && isConnected) {
      socket.emit('leave-case-room', { caseId });
      
      // 退出確認リスナー（一度だけ）
      socket.once('left-room', (data) => {
        console.log('Left case room:', data);
      });
    }
  }, [socket, isConnected]);

  // ケース更新を送信
  const sendCaseUpdate = useCallback((caseId: number, data: any) => {
    if (socket && isConnected) {
      socket.emit('case-updated', { caseId, data });
    }
  }, [socket, isConnected]);

  // ステップ更新を送信
  const sendStepUpdate = useCallback((caseId: number, stepId: number, data: any) => {
    if (socket && isConnected) {
      socket.emit('step-updated', { caseId, stepId, data });
    }
  }, [socket, isConnected]);

  // オフライン/オンライン検出
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online - reconnecting WebSocket');
      if (!isConnected) {
        connect();
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
  }, [isConnected, connect]);

  // ページ可視性変更時の処理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('Page became visible - checking WebSocket connection');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, connect]);

  const value = {
    socket,
    isConnected,
    connectionError,
    joinCaseRoom,
    leaveCaseRoom,
    sendCaseUpdate,
    sendStepUpdate,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};