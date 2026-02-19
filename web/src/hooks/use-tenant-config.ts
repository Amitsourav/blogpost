import { useState, useCallback } from 'react';
import { getConfig, setConfig, clearConfig } from '@/lib/config';
import type { TenantConfig } from '@/types';

export function useTenantConfig() {
  const [config, setConfigState] = useState<TenantConfig | null>(getConfig);

  const save = useCallback((newConfig: TenantConfig) => {
    setConfig(newConfig);
    setConfigState(newConfig);
  }, []);

  const clear = useCallback(() => {
    clearConfig();
    setConfigState(null);
  }, []);

  return { config, isConfigured: !!config, save, clear };
}
