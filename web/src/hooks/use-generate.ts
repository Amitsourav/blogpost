import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ContentTask, GenerateResponse } from '@/types';

export function useGenerate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { topic: string; keywords?: string[] }) =>
      api.post<GenerateResponse>('/content/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useTaskPolling(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get<ContentTask>(`/content/tasks/${taskId}`),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 2000;
      if (['PUBLISHED', 'FAILED', 'CANCELLED'].includes(status)) return false;
      return 2000;
    },
  });
}
