'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../contexts/websocket-context';
import { toast } from '../components/ui/toast';

interface CaseUpdateEvent {
  caseId: number;
  data: any;
  updatedBy?: string;
  timestamp: string;
}

interface StepUpdateEvent {
  caseId: number;
  stepId: number;
  data: any;
  updatedBy?: string;
  timestamp: string;
}

interface UseRealtimeUpdatesOptions {
  caseId?: number;
  onCaseUpdate?: (event: CaseUpdateEvent) => void;
  onStepUpdate?: (event: StepUpdateEvent) => void;
  onUserJoined?: (userId: string, caseId: number) => void;
  onUserLeft?: (userId: string, caseId: number) => void;
  enableNotifications?: boolean;
}

export const useRealtimeUpdates = ({
  caseId,
  onCaseUpdate,
  onStepUpdate,
  onUserJoined,
  onUserLeft,
  enableNotifications = true,
}: UseRealtimeUpdatesOptions = {}) => {
  const { socket, isConnected, joinCaseRoom, leaveCaseRoom } = useWebSocket();
  const queryClient = useQueryClient();
  const currentCaseId = useRef<number | undefined>(caseId);
  const pendingUpdates = useRef<Map<string, any>>(new Map());

  // ケース更新ハンドラー
  const handleCaseUpdate = useCallback((event: CaseUpdateEvent) => {
    console.log('Received case update:', event);

    // 楽観的更新のロールバック判定
    const pendingKey = `case-${event.caseId}`;
    const pendingUpdate = pendingUpdates.current.get(pendingKey);
    
    if (pendingUpdate && pendingUpdate.timestamp > new Date(event.timestamp)) {
      // ローカルの更新の方が新しい場合はスキップ
      console.log('Skipping older server update');
      return;
    }

    // React Queryキャッシュを更新
    queryClient.setQueryData(['case', event.caseId], (oldData: any) => {
      if (!oldData) return event.data;
      return { ...oldData, ...event.data };
    });

    // 関連するクエリを無効化
    queryClient.invalidateQueries({ queryKey: ['cases'] });

    // カスタムハンドラーを実行
    if (onCaseUpdate) {
      onCaseUpdate(event);
    }

    // 通知を表示
    if (enableNotifications && event.updatedBy && event.updatedBy !== socket?.id) {
      toast.info(`ケースが更新されました`);
    }

    // ペンディング更新をクリア
    pendingUpdates.current.delete(pendingKey);
  }, [queryClient, onCaseUpdate, enableNotifications, socket]);

  // ステップ更新ハンドラー
  const handleStepUpdate = useCallback((event: StepUpdateEvent) => {
    console.log('Received step update:', event);

    // 楽観的更新のロールバック判定
    const pendingKey = `step-${event.stepId}`;
    const pendingUpdate = pendingUpdates.current.get(pendingKey);
    
    if (pendingUpdate && pendingUpdate.timestamp > new Date(event.timestamp)) {
      // ローカルの更新の方が新しい場合はスキップ
      console.log('Skipping older server update');
      return;
    }

    // ステップ単体のキャッシュを更新
    queryClient.setQueryData(['step', event.stepId], (oldData: any) => {
      if (!oldData) return event.data;
      return { ...oldData, ...event.data };
    });

    // ケース詳細のキャッシュ内のステップを更新
    queryClient.setQueryData(['case', event.caseId], (oldData: any) => {
      if (!oldData || !oldData.steps) return oldData;
      
      const updatedSteps = oldData.steps.map((step: any) => 
        step.id === event.stepId ? { ...step, ...event.data } : step
      );
      
      return { ...oldData, steps: updatedSteps };
    });

    // 関連するクエリを無効化
    queryClient.invalidateQueries({ queryKey: ['cases'] });
    queryClient.invalidateQueries({ queryKey: ['steps', event.caseId] });

    // カスタムハンドラーを実行
    if (onStepUpdate) {
      onStepUpdate(event);
    }

    // 通知を表示
    if (enableNotifications && event.updatedBy && event.updatedBy !== socket?.id) {
      toast.info(`ステップが更新されました`);
    }

    // ペンディング更新をクリア
    pendingUpdates.current.delete(pendingKey);
  }, [queryClient, onStepUpdate, enableNotifications, socket]);

  // ユーザー参加ハンドラー
  const handleUserJoined = useCallback((data: { userId: string; caseId: number }) => {
    console.log('User joined:', data);
    
    if (onUserJoined) {
      onUserJoined(data.userId, data.caseId);
    }
    
    if (enableNotifications) {
      toast.info('他のユーザーがこのケースを閲覧しています');
    }
  }, [onUserJoined, enableNotifications]);

  // ユーザー退出ハンドラー
  const handleUserLeft = useCallback((data: { userId: string; caseId: number }) => {
    console.log('User left:', data);
    
    if (onUserLeft) {
      onUserLeft(data.userId, data.caseId);
    }
  }, [onUserLeft]);

  // WebSocketイベントリスナーの設定
  useEffect(() => {
    if (!socket) return;

    // イベントリスナーを登録
    socket.on('case-update', handleCaseUpdate);
    socket.on('step-update', handleStepUpdate);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    // クリーンアップ
    return () => {
      socket.off('case-update', handleCaseUpdate);
      socket.off('step-update', handleStepUpdate);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, handleCaseUpdate, handleStepUpdate, handleUserJoined, handleUserLeft]);

  // ケースルームへの参加/退出管理
  useEffect(() => {
    if (!isConnected || !caseId) return;

    // 新しいケースルームに参加
    joinCaseRoom(caseId);
    currentCaseId.current = caseId;

    // クリーンアップ時に退出
    return () => {
      if (currentCaseId.current) {
        leaveCaseRoom(currentCaseId.current);
        currentCaseId.current = undefined;
      }
    };
  }, [isConnected, caseId, joinCaseRoom, leaveCaseRoom]);

  // 楽観的更新のヘルパー関数
  const optimisticUpdate = useCallback((key: string, data: any) => {
    pendingUpdates.current.set(key, {
      data,
      timestamp: new Date(),
    });

    // タイムアウト後に自動削除（サーバーから応答がない場合）
    setTimeout(() => {
      pendingUpdates.current.delete(key);
    }, 5000);
  }, []);

  // 楽観的ケース更新
  const optimisticCaseUpdate = useCallback((caseId: number, data: any) => {
    const key = `case-${caseId}`;
    optimisticUpdate(key, data);

    // 即座にローカルキャッシュを更新
    queryClient.setQueryData(['case', caseId], (oldData: any) => {
      if (!oldData) return data;
      return { ...oldData, ...data };
    });
  }, [queryClient, optimisticUpdate]);

  // 楽観的ステップ更新
  const optimisticStepUpdate = useCallback((caseId: number, stepId: number, data: any) => {
    const key = `step-${stepId}`;
    optimisticUpdate(key, data);

    // 即座にローカルキャッシュを更新
    queryClient.setQueryData(['step', stepId], (oldData: any) => {
      if (!oldData) return data;
      return { ...oldData, ...data };
    });

    // ケース内のステップも更新
    queryClient.setQueryData(['case', caseId], (oldData: any) => {
      if (!oldData || !oldData.steps) return oldData;
      
      const updatedSteps = oldData.steps.map((step: any) => 
        step.id === stepId ? { ...step, ...data } : step
      );
      
      return { ...oldData, steps: updatedSteps };
    });
  }, [queryClient, optimisticUpdate]);

  return {
    isConnected,
    optimisticCaseUpdate,
    optimisticStepUpdate,
  };
};