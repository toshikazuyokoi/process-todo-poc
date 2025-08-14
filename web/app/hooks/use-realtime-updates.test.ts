import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtimeUpdates } from './use-realtime-updates';
import { toast } from '../components/ui/toast';

// モック
jest.mock('../contexts/websocket-context', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('../components/ui/toast', () => ({
  toast: {
    info: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { useWebSocket } from '../contexts/websocket-context';

describe('useRealtimeUpdates', () => {
  let queryClient: QueryClient;
  let mockSocket: any;
  let mockJoinCaseRoom: jest.Mock;
  let mockLeaveCaseRoom: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockSocket = {
      id: 'test-socket-id',
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };

    mockJoinCaseRoom = jest.fn();
    mockLeaveCaseRoom = jest.fn();

    (useWebSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      joinCaseRoom: mockJoinCaseRoom,
      leaveCaseRoom: mockLeaveCaseRoom,
    });

    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Room management', () => {
    it('should join case room when caseId is provided and connected', () => {
      const { unmount } = renderHook(
        () => useRealtimeUpdates({ caseId: 123 }),
        { wrapper }
      );

      expect(mockJoinCaseRoom).toHaveBeenCalledWith(123);

      unmount();
      expect(mockLeaveCaseRoom).toHaveBeenCalledWith(123);
    });

    it('should not join room when disconnected', () => {
      (useWebSocket as jest.Mock).mockReturnValue({
        socket: mockSocket,
        isConnected: false,
        joinCaseRoom: mockJoinCaseRoom,
        leaveCaseRoom: mockLeaveCaseRoom,
      });

      renderHook(() => useRealtimeUpdates({ caseId: 123 }), { wrapper });

      expect(mockJoinCaseRoom).not.toHaveBeenCalled();
    });

    it('should switch rooms when caseId changes', () => {
      const { rerender, unmount } = renderHook(
        ({ caseId }) => useRealtimeUpdates({ caseId }),
        {
          wrapper,
          initialProps: { caseId: 123 },
        }
      );

      expect(mockJoinCaseRoom).toHaveBeenCalledWith(123);

      rerender({ caseId: 456 });

      expect(mockLeaveCaseRoom).toHaveBeenCalledWith(123);
      expect(mockJoinCaseRoom).toHaveBeenCalledWith(456);

      unmount();
    });
  });

  describe('Event listeners', () => {
    it('should register event listeners on mount', () => {
      renderHook(() => useRealtimeUpdates({ caseId: 123 }), { wrapper });

      expect(mockSocket.on).toHaveBeenCalledWith('case-update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('step-update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-left', expect.any(Function));
    });

    it('should unregister event listeners on unmount', () => {
      const { unmount } = renderHook(
        () => useRealtimeUpdates({ caseId: 123 }),
        { wrapper }
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('case-update', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('step-update', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('user-joined', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('user-left', expect.any(Function));
    });
  });

  describe('Case updates', () => {
    it('should handle case update event', async () => {
      const onCaseUpdate = jest.fn();
      
      renderHook(
        () => useRealtimeUpdates({ caseId: 123, onCaseUpdate }),
        { wrapper }
      );

      // case-updateイベントハンドラーを取得
      const caseUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'case-update'
      )[1];

      const updateEvent = {
        caseId: 123,
        data: { status: 'IN_PROGRESS' },
        updatedBy: 'other-user',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        caseUpdateHandler(updateEvent);
      });

      await waitFor(() => {
        expect(onCaseUpdate).toHaveBeenCalledWith(updateEvent);
        expect(toast.info).toHaveBeenCalledWith('ケースが更新されました');
      });
    });

    it('should update query cache on case update', async () => {
      // 初期データをセット
      queryClient.setQueryData(['case', 123], {
        id: 123,
        title: 'Test Case',
        status: 'TODO',
      });

      renderHook(() => useRealtimeUpdates({ caseId: 123 }), { wrapper });

      const caseUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'case-update'
      )[1];

      act(() => {
        caseUpdateHandler({
          caseId: 123,
          data: { status: 'IN_PROGRESS' },
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        const updatedData = queryClient.getQueryData(['case', 123]) as any;
        expect(updatedData.status).toBe('IN_PROGRESS');
      });
    });

    it('should skip notification for own updates', () => {
      renderHook(() => useRealtimeUpdates({ caseId: 123 }), { wrapper });

      const caseUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'case-update'
      )[1];

      act(() => {
        caseUpdateHandler({
          caseId: 123,
          data: { status: 'IN_PROGRESS' },
          updatedBy: 'test-socket-id', // 自分のソケットID
          timestamp: new Date().toISOString(),
        });
      });

      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe('Step updates', () => {
    it('should handle step update event', async () => {
      const onStepUpdate = jest.fn();
      
      renderHook(
        () => useRealtimeUpdates({ caseId: 123, onStepUpdate }),
        { wrapper }
      );

      const stepUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'step-update'
      )[1];

      const updateEvent = {
        caseId: 123,
        stepId: 456,
        data: { status: 'DONE' },
        updatedBy: 'other-user',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        stepUpdateHandler(updateEvent);
      });

      await waitFor(() => {
        expect(onStepUpdate).toHaveBeenCalledWith(updateEvent);
        expect(toast.info).toHaveBeenCalledWith('ステップが更新されました');
      });
    });

    it('should update step in case cache', async () => {
      // 初期データをセット
      queryClient.setQueryData(['case', 123], {
        id: 123,
        title: 'Test Case',
        steps: [
          { id: 456, title: 'Step 1', status: 'TODO' },
          { id: 457, title: 'Step 2', status: 'TODO' },
        ],
      });

      renderHook(() => useRealtimeUpdates({ caseId: 123 }), { wrapper });

      const stepUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'step-update'
      )[1];

      act(() => {
        stepUpdateHandler({
          caseId: 123,
          stepId: 456,
          data: { status: 'DONE' },
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        const caseData = queryClient.getQueryData(['case', 123]) as any;
        expect(caseData.steps[0].status).toBe('DONE');
        expect(caseData.steps[1].status).toBe('TODO');
      });
    });
  });

  describe('Optimistic updates', () => {
    it('should perform optimistic case update', async () => {
      queryClient.setQueryData(['case', 123], {
        id: 123,
        title: 'Test Case',
        status: 'TODO',
      });

      const { result } = renderHook(
        () => useRealtimeUpdates({ caseId: 123 }),
        { wrapper }
      );

      act(() => {
        result.current.optimisticCaseUpdate(123, { status: 'IN_PROGRESS' });
      });

      const updatedData = queryClient.getQueryData(['case', 123]) as any;
      expect(updatedData.status).toBe('IN_PROGRESS');
    });

    it('should perform optimistic step update', async () => {
      queryClient.setQueryData(['case', 123], {
        id: 123,
        steps: [
          { id: 456, status: 'TODO' },
        ],
      });

      const { result } = renderHook(
        () => useRealtimeUpdates({ caseId: 123 }),
        { wrapper }
      );

      act(() => {
        result.current.optimisticStepUpdate(123, 456, { status: 'DONE' });
      });

      const caseData = queryClient.getQueryData(['case', 123]) as any;
      expect(caseData.steps[0].status).toBe('DONE');
    });

    it('should skip older server updates after optimistic update', async () => {
      const onCaseUpdate = jest.fn();
      
      const { result } = renderHook(
        () => useRealtimeUpdates({ caseId: 123, onCaseUpdate }),
        { wrapper }
      );

      // 楽観的更新を実行
      act(() => {
        result.current.optimisticCaseUpdate(123, { status: 'IN_PROGRESS' });
      });

      const caseUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'case-update'
      )[1];

      // 古いタイムスタンプでサーバー更新を受信
      act(() => {
        caseUpdateHandler({
          caseId: 123,
          data: { status: 'TODO' },
          timestamp: new Date(Date.now() - 10000).toISOString(), // 10秒前
        });
      });

      // ハンドラーは呼ばれない
      expect(onCaseUpdate).not.toHaveBeenCalled();
    });
  });

  describe('User presence', () => {
    it('should handle user joined event', () => {
      const onUserJoined = jest.fn();
      
      renderHook(
        () => useRealtimeUpdates({ caseId: 123, onUserJoined }),
        { wrapper }
      );

      const userJoinedHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'user-joined'
      )[1];

      act(() => {
        userJoinedHandler({ userId: 'user-123', caseId: 123 });
      });

      expect(onUserJoined).toHaveBeenCalledWith('user-123', 123);
      expect(toast.info).toHaveBeenCalledWith('他のユーザーがこのケースを閲覧しています');
    });

    it('should handle user left event', () => {
      const onUserLeft = jest.fn();
      
      renderHook(
        () => useRealtimeUpdates({ caseId: 123, onUserLeft }),
        { wrapper }
      );

      const userLeftHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'user-left'
      )[1];

      act(() => {
        userLeftHandler({ userId: 'user-123', caseId: 123 });
      });

      expect(onUserLeft).toHaveBeenCalledWith('user-123', 123);
    });
  });

  describe('Notifications', () => {
    it('should disable notifications when enableNotifications is false', () => {
      renderHook(
        () => useRealtimeUpdates({ caseId: 123, enableNotifications: false }),
        { wrapper }
      );

      const caseUpdateHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'case-update'
      )[1];

      act(() => {
        caseUpdateHandler({
          caseId: 123,
          data: { status: 'IN_PROGRESS' },
          updatedBy: 'other-user',
          timestamp: new Date().toISOString(),
        });
      });

      expect(toast.info).not.toHaveBeenCalled();
    });
  });
});