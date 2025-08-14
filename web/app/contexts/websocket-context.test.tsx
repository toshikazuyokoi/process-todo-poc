import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from './websocket-context';
import { io, Socket } from 'socket.io-client';

// socket.io-clientのモック
jest.mock('socket.io-client');

describe('WebSocketContext', () => {
  let mockSocket: Partial<Socket>;
  let mockIo: jest.MockedFunction<typeof io>;

  beforeEach(() => {
    // Socketのモック
    mockSocket = {
      id: 'test-socket-id',
      connected: true,
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      off: jest.fn(),
    };

    // ioのモック
    mockIo = io as jest.MockedFunction<typeof io>;
    mockIo.mockReturnValue(mockSocket as Socket);

    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('WebSocketProvider', () => {
    it('should initialize socket connection on mount', () => {
      render(
        <WebSocketProvider>
          <div>Test Content</div>
        </WebSocketProvider>
      );

      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:3001/realtime',
        expect.objectContaining({
          auth: { token: 'dummy-token' },
          transports: ['websocket', 'polling'],
          reconnection: false,
        })
      );
    });

    it('should handle connect event', async () => {
      const TestComponent = () => {
        const { isConnected, connectionError } = useWebSocket();
        return (
          <div>
            <div data-testid="connected">{isConnected ? 'Connected' : 'Disconnected'}</div>
            <div data-testid="error">{connectionError || 'No error'}</div>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // connectイベントハンドラーを取得して実行
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];

      act(() => {
        connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected');
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });
    });

    it('should handle connection error', async () => {
      const TestComponent = () => {
        const { isConnected, connectionError } = useWebSocket();
        return (
          <div>
            <div data-testid="connected">{isConnected ? 'Connected' : 'Disconnected'}</div>
            <div data-testid="error">{connectionError || 'No error'}</div>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // connect_errorイベントハンドラーを取得して実行
      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];

      act(() => {
        errorHandler(new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Disconnected');
        expect(screen.getByTestId('error')).toHaveTextContent('Connection failed');
      });
    });

    it('should handle disconnect event', async () => {
      const TestComponent = () => {
        const { isConnected } = useWebSocket();
        return <div data-testid="connected">{isConnected ? 'Connected' : 'Disconnected'}</div>;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // まず接続
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      act(() => {
        connectHandler();
      });

      // 次に切断
      const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      act(() => {
        disconnectHandler('io client disconnect');
      });

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Disconnected');
      });
    });
  });

  describe('useWebSocket hooks', () => {
    it('should join case room when connected', () => {
      const TestComponent = () => {
        const { joinCaseRoom, isConnected } = useWebSocket();
        
        React.useEffect(() => {
          if (isConnected) {
            joinCaseRoom(123);
          }
        }, [isConnected, joinCaseRoom]);
        
        return null;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // 接続イベントを発火
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      act(() => {
        connectHandler();
      });

      // joinCaseRoomが呼ばれたことを確認
      expect(mockSocket.emit).toHaveBeenCalledWith('join-case-room', { caseId: 123 });
    });

    it('should leave case room when connected', () => {
      const TestComponent = () => {
        const { leaveCaseRoom, isConnected } = useWebSocket();
        
        React.useEffect(() => {
          if (isConnected) {
            leaveCaseRoom(123);
          }
        }, [isConnected, leaveCaseRoom]);
        
        return null;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // 接続イベントを発火
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      act(() => {
        connectHandler();
      });

      // leaveCaseRoomが呼ばれたことを確認
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-case-room', { caseId: 123 });
    });

    it('should send case update when connected', () => {
      const TestComponent = () => {
        const { sendCaseUpdate, isConnected } = useWebSocket();
        
        React.useEffect(() => {
          if (isConnected) {
            sendCaseUpdate(123, { status: 'IN_PROGRESS' });
          }
        }, [isConnected, sendCaseUpdate]);
        
        return null;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // 接続イベントを発火
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      act(() => {
        connectHandler();
      });

      // sendCaseUpdateが呼ばれたことを確認
      expect(mockSocket.emit).toHaveBeenCalledWith('case-updated', {
        caseId: 123,
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should send step update when connected', () => {
      const TestComponent = () => {
        const { sendStepUpdate, isConnected } = useWebSocket();
        
        React.useEffect(() => {
          if (isConnected) {
            sendStepUpdate(123, 456, { status: 'DONE' });
          }
        }, [isConnected, sendStepUpdate]);
        
        return null;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // 接続イベントを発火
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      act(() => {
        connectHandler();
      });

      // sendStepUpdateが呼ばれたことを確認
      expect(mockSocket.emit).toHaveBeenCalledWith('step-updated', {
        caseId: 123,
        stepId: 456,
        data: { status: 'DONE' },
      });
    });

    it('should not emit when disconnected', () => {
      const TestComponent = () => {
        const { joinCaseRoom, isConnected } = useWebSocket();
        
        React.useEffect(() => {
          joinCaseRoom(123); // 接続前に呼ぶ
        }, [joinCaseRoom]);
        
        return <div data-testid="connected">{isConnected ? 'Connected' : 'Disconnected'}</div>;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // emitが呼ばれていないことを確認
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(screen.getByTestId('connected')).toHaveTextContent('Disconnected');
    });
  });

  describe('Error handling', () => {
    it('should throw error when useWebSocket is used outside provider', () => {
      const TestComponent = () => {
        useWebSocket();
        return null;
      };

      // エラーをキャッチ
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useWebSocket must be used within WebSocketProvider');
      
      spy.mockRestore();
    });
  });

  describe('Reconnection logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should attempt reconnection on connection error', async () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // 初回接続
      expect(mockIo).toHaveBeenCalledTimes(1);

      // connect_errorイベントを発火
      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];

      act(() => {
        errorHandler(new Error('Connection failed'));
      });

      // タイマーを進める
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // 再接続が試みられることを確認
      await waitFor(() => {
        expect(mockIo).toHaveBeenCalledTimes(2);
      });
    });

    it('should use exponential backoff for reconnection', async () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];

      // 1回目の失敗 - 3秒後に再接続
      act(() => {
        errorHandler(new Error('Connection failed'));
      });
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // 2回目の失敗 - 6秒後に再接続
      act(() => {
        errorHandler(new Error('Connection failed'));
      });
      
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // 3回目の失敗 - 12秒後に再接続
      act(() => {
        errorHandler(new Error('Connection failed'));
      });
      
      act(() => {
        jest.advanceTimersByTime(12000);
      });

      // 各失敗後に再接続が試みられることを確認
      await waitFor(() => {
        expect(mockIo).toHaveBeenCalledTimes(4); // 初回 + 3回の再接続
      });
    });
  });
});