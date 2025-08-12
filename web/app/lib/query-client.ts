import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // データの鮮度設定
      staleTime: 1000 * 60 * 5, // 5分間はデータを新鮮とみなす
      gcTime: 1000 * 60 * 10, // 10分間キャッシュを保持（旧cacheTime）
      
      // リトライ設定
      retry: (failureCount, error: any) => {
        // 404エラーはリトライしない
        if (error?.response?.status === 404) return false;
        // 最大3回までリトライ
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // リフェッチ設定
      refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動リフェッチを無効化
      refetchOnMount: true, // マウント時のリフェッチ
      refetchOnReconnect: 'always', // 再接続時は常にリフェッチ
    },
    mutations: {
      // ミューテーション設定
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// キャッシュ無効化ヘルパー
export const invalidateQueries = {
  // ケース関連
  cases: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  case: (id: number) => queryClient.invalidateQueries({ queryKey: ['case', id] }),
  casesByStatus: (status: string) => 
    queryClient.invalidateQueries({ queryKey: ['cases', { status }] }),
  
  // テンプレート関連
  templates: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  template: (id: number) => queryClient.invalidateQueries({ queryKey: ['template', id] }),
  
  // ダッシュボード
  dashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  
  // ガントチャート
  gantt: () => queryClient.invalidateQueries({ queryKey: ['gantt'] }),
  
  // ユーザー関連
  userCases: (userId: number) => 
    queryClient.invalidateQueries({ queryKey: ['cases', { userId }] }),
  
  // すべてのキャッシュをクリア
  all: () => queryClient.invalidateQueries(),
};

// プリフェッチヘルパー
export const prefetchQueries = {
  // ケース詳細をプリフェッチ
  case: async (id: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['case', id],
      queryFn: () => fetch(`/api/cases/${id}`).then(res => res.json()),
      staleTime: 1000 * 60 * 5,
    });
  },
  
  // テンプレート詳細をプリフェッチ
  template: async (id: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['template', id],
      queryFn: () => fetch(`/api/templates/${id}`).then(res => res.json()),
      staleTime: 1000 * 60 * 10,
    });
  },
  
  // ダッシュボードデータをプリフェッチ
  dashboard: async () => {
    await queryClient.prefetchQuery({
      queryKey: ['dashboard'],
      queryFn: () => fetch('/api/dashboard').then(res => res.json()),
      staleTime: 1000 * 30,
    });
  },
};

// オプティミスティック更新ヘルパー
export const optimisticUpdate = {
  // ケースステータス更新
  caseStatus: (caseId: number, newStatus: string) => {
    queryClient.setQueryData(['case', caseId], (old: any) => ({
      ...old,
      status: newStatus,
    }));
  },
  
  // ステップ完了
  completeStep: (caseId: number, stepId: number) => {
    queryClient.setQueryData(['case', caseId], (old: any) => ({
      ...old,
      steps: old?.steps?.map((step: any) =>
        step.id === stepId ? { ...step, status: 'completed' } : step
      ),
    }));
  },
};

// バックグラウンド同期
export const setupBackgroundSync = () => {
  // 5分ごとにダッシュボードをリフレッシュ
  setInterval(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['dashboard'],
      refetchType: 'inactive',
    });
  }, 1000 * 60 * 5);
  
  // 10分ごとに古いケースデータをリフレッシュ
  setInterval(() => {
    queryClient.invalidateQueries({
      queryKey: ['cases'],
      refetchType: 'inactive',
      predicate: (query) => {
        const lastFetch = query.state.dataUpdatedAt;
        const tenMinutesAgo = Date.now() - 1000 * 60 * 10;
        return lastFetch < tenMinutesAgo;
      },
    });
  }, 1000 * 60 * 10);
};