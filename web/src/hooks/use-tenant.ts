import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Tenant } from '@/types';

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => api.get<Tenant>(`/tenants/${tenantId}`),
    enabled: !!tenantId,
  });
}
