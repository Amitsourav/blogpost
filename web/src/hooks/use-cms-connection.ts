import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CMSConnection } from '@/types';

export function useCreateCmsConnection(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      accessToken: string;
      contentDatabaseId: string;
      triggerDatabaseId?: string;
    }) => api.post<CMSConnection>(`/tenants/${tenantId}/cms-connections`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    },
  });
}
