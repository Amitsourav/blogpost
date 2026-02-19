import { getConfig } from './config';

// In production, frontend is served by the same server — use relative URL
const API_BASE = import.meta.env.PROD
  ? '/api/v1'
  : 'http://localhost:3001/api/v1';

class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const config = getConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (config?.apiKey) {
    headers['X-Tenant-Key'] = config.apiKey;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export { ApiError };
