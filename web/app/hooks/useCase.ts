import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/app/lib/api-client';
import { invalidateQueries } from '@/app/lib/query-client';
import { useToast } from '@/app/components/ui/toast';

// ケース一覧を取得
export function useCases(status?: string) {
  return useQuery({
    queryKey: ['cases', { status }],
    queryFn: async () => {
      const params = status ? { status } : {};
      const { data } = await apiClient.get('/cases', { params });
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2分
  });
}

// ケース詳細を取得
export function useCase(id: number | string) {
  return useQuery({
    queryKey: ['case', Number(id)],
    queryFn: async () => {
      const { data } = await apiClient.get(`/cases/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5分
  });
}

// ケース作成
export function useCreateCase() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (caseData: any) => {
      const { data } = await apiClient.post('/cases', caseData);
      return data;
    },
    onSuccess: (data) => {
      // キャッシュ更新
      invalidateQueries.cases();
      invalidateQueries.dashboard();
      
      // 新しいケースをキャッシュに追加
      queryClient.setQueryData(['case', data.id], data);
      
      showToast('ケースを作成しました', 'success');
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.message || 'ケースの作成に失敗しました',
        'error'
      );
    },
  });
}

// ケース更新
export function useUpdateCase() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiClient.patch(`/cases/${id}`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      // オプティミスティック更新
      await queryClient.cancelQueries({ queryKey: ['case', id] });
      const previousCase = queryClient.getQueryData(['case', id]);
      
      queryClient.setQueryData(['case', id], (old: any) => ({
        ...old,
        ...data,
      }));
      
      return { previousCase };
    },
    onError: (error: any, variables, context) => {
      // エラー時はロールバック
      if (context?.previousCase) {
        queryClient.setQueryData(['case', variables.id], context.previousCase);
      }
      
      showToast(
        error.response?.data?.message || 'ケースの更新に失敗しました',
        'error'
      );
    },
    onSuccess: (data, variables) => {
      // 関連するキャッシュを更新
      invalidateQueries.cases();
      invalidateQueries.dashboard();
      
      showToast('ケースを更新しました', 'success');
    },
  });
}

// ケース削除
export function useDeleteCase() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/cases/${id}`);
    },
    onSuccess: (_, id) => {
      // キャッシュから削除
      queryClient.removeQueries({ queryKey: ['case', id] });
      invalidateQueries.cases();
      invalidateQueries.dashboard();
      
      showToast('ケースを削除しました', 'success');
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.message || 'ケースの削除に失敗しました',
        'error'
      );
    },
  });
}

// ステップ完了
export function useCompleteStep() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ caseId, stepId }: { caseId: number; stepId: number }) => {
      const { data } = await apiClient.post(`/cases/${caseId}/steps/${stepId}/complete`);
      return data;
    },
    onMutate: async ({ caseId, stepId }) => {
      // オプティミスティック更新
      await queryClient.cancelQueries({ queryKey: ['case', caseId] });
      const previousCase = queryClient.getQueryData(['case', caseId]);
      
      queryClient.setQueryData(['case', caseId], (old: any) => ({
        ...old,
        steps: old?.steps?.map((step: any) =>
          step.id === stepId ? { ...step, status: 'completed' } : step
        ),
      }));
      
      return { previousCase };
    },
    onError: (error: any, variables, context) => {
      // エラー時はロールバック
      if (context?.previousCase) {
        queryClient.setQueryData(['case', variables.caseId], context.previousCase);
      }
      
      showToast(
        error.response?.data?.message || 'ステップの完了に失敗しました',
        'error'
      );
    },
    onSuccess: (_, variables) => {
      invalidateQueries.case(variables.caseId);
      invalidateQueries.dashboard();
      
      showToast('ステップを完了しました', 'success');
    },
  });
}

// ダッシュボードデータ取得
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard');
      return data;
    },
    staleTime: 1000 * 30, // 30秒
    refetchInterval: 1000 * 60 * 5, // 5分ごとに自動更新
  });
}

// ガントチャートデータ取得
export function useGanttData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['gantt', { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.get('/gantt', {
        params: { startDate, endDate },
      });
      return data;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2, // 2分
  });
}

// 期限切れケース取得
export function useOverdueCases() {
  return useQuery({
    queryKey: ['cases', 'overdue'],
    queryFn: async () => {
      const { data } = await apiClient.get('/cases/overdue');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5分
  });
}

// 今後のケース取得
export function useUpcomingCases(days: number = 7) {
  return useQuery({
    queryKey: ['cases', 'upcoming', { days }],
    queryFn: async () => {
      const { data } = await apiClient.get('/cases/upcoming', {
        params: { days },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5分
  });
}