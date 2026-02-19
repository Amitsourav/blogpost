import type { TenantConfig } from '@/types';

const STORAGE_KEY = 'blog-agent-config';

export function getConfig(): TenantConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TenantConfig;
  } catch {
    return null;
  }
}

export function setConfig(config: TenantConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
