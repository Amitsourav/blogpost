import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ message: 'rate limit', status: 429 })
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue({ message: 'server error', status: 500 });

    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toEqual({
      message: 'server error',
      status: 500,
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable status code', async () => {
    const fn = vi.fn().mockRejectedValue({ message: 'bad request', status: 400 });

    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toEqual({
      message: 'bad request',
      status: 400,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
