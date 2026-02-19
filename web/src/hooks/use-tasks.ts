import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { TaskListResponse, ContentTask, ContentTaskStatus } from '@/types';

export function useTasks(params: { page?: number; limit?: number; status?: ContentTaskStatus | '' }) {
  const { page = 1, limit = 20, status } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (status) searchParams.set('status', status);

  return useQuery({
    queryKey: ['tasks', page, limit, status],
    queryFn: () => api.get<TaskListResponse>(`/content/tasks?${searchParams}`),
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get<ContentTask>(`/content/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useRetryTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      api.post<{ message: string; taskId: string; status: string }>(
        `/content/tasks/${taskId}/retry`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
