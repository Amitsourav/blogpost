import { logger } from '../../config/logger';

interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  retryableStatusCodes: [429, 500, 502, 503],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const statusCode = error?.status || error?.statusCode;
      const isRetryable =
        !statusCode || (opts.retryableStatusCodes?.includes(statusCode) ?? false);

      if (attempt === opts.maxAttempts || !isRetryable) {
        throw error;
      }

      const delay = opts.baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`, {
        error: error.message,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry exhausted');
}
