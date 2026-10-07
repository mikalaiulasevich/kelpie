import { TimeoutError } from 'es-toolkit/error';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StartupDeadline } from '../fixtures/startup-deadline.js';
import { StartupProcessPolicy } from '../fixtures/startup-policy.js';

describe('startup deadline ownership', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the timer after success without running expiration', async () => {
    const expire = vi.fn((): never => {
      throw new Error('Unexpected expiration.');
    });

    await expect(
      StartupDeadline.wait(
        Promise.resolve('ready'),
        StartupProcessPolicy.TimeoutMilliseconds,
        expire,
      ),
    ).resolves.toBe('ready');
    expect(vi.getTimerCount()).toBe(0);
    await vi.runAllTimersAsync();
    expect(expire).not.toHaveBeenCalled();
  });

  it('preserves operation timeout errors without confusing them with its own deadline', async () => {
    const failure = new TimeoutError();
    const expire = vi.fn((): never => {
      throw new Error('Unexpected expiration.');
    });

    await expect(
      StartupDeadline.wait(
        Promise.reject(failure),
        StartupProcessPolicy.TimeoutMilliseconds,
        expire,
      ),
    ).rejects.toBe(failure);
    expect(vi.getTimerCount()).toBe(0);
    expect(expire).not.toHaveBeenCalled();
  });

  it('runs expiration once and preserves its error when the operation never settles', async () => {
    const failure = new Error('Deadline expired.');
    const expire = vi.fn((): never => {
      throw failure;
    });
    const operation = new Promise<never>(() => {});
    const outcome = expect(
      StartupDeadline.wait(operation, StartupProcessPolicy.TimeoutMilliseconds, expire),
    ).rejects.toBe(failure);

    await vi.advanceTimersByTimeAsync(StartupProcessPolicy.TimeoutMilliseconds);
    await outcome;
    expect(expire).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
