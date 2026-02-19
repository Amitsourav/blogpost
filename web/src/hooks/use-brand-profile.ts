import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { BrandProfile } from '@/types';

export function useUpdateBrandProfile(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<BrandProfile>) =>
      api.put<BrandProfile>(`/tenants/${tenantId}/brand-profile`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    },
  });
}
