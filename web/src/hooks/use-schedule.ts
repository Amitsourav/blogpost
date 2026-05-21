import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  ScheduleConfig,
  ScheduledPostListResponse,
  ScheduledPost,
  ScheduledPostStatus,
} from '@/types';

export function useScheduleConfig() {
  return useQuery({
    queryKey: ['schedule-config'],
    queryFn: () => api.get<ScheduleConfig>('/schedule/config'),
  });
}

export function useUpsertScheduleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { postsPerDay: number; timeOfDay: string; timezone: string; isActive: boolean }) =>
      api.put<ScheduleConfig>('/schedule/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-config'] });
    },
  });
}

export function useScheduledPosts(params: { page?: number; limit?: number; status?: ScheduledPostStatus | '' }) {
  const { page = 1, limit = 20, status } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (status) searchParams.set('status', status);

  return useQuery({
    queryKey: ['schedule-posts', page, limit, status],
    queryFn: () => api.get<ScheduledPostListResponse>(`/schedule/posts?${searchParams}`),
  });
}

export function useAddScheduledPosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { posts: { topic: string; keywords?: string[] }[] }) =>
      api.post<{ posts: ScheduledPost[]; count: number }>('/schedule/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-posts'] });
    },
  });
}

export function useReorderPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, newPosition }: { postId: string; newPosition: number }) =>
      api.patch<ScheduledPost>(`/schedule/posts/${postId}/reorder`, { newPosition }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-posts'] });
    },
  });
}

export function useCancelPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      api.post<ScheduledPost>(`/schedule/posts/${postId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-posts'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      api.delete<{ message: string }>(`/schedule/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-posts'] });
    },
  });
}
