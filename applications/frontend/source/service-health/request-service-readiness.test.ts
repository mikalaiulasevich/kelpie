import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestServiceReadiness } from './request-service-readiness';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('service readiness', () => {
  it('requires a successful readiness response rather than any reachable endpoint', async () => {
    const fetchResponse = vi.fn().mockResolvedValue(Response.json({ status: 'ready' }));
    vi.stubGlobal('fetch', fetchResponse);
    await expect(requestServiceReadiness(new AbortController().signal)).resolves.toBeUndefined();
    expect(fetchResponse).toHaveBeenCalledWith(
      '/api/health/ready',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'same-origin',
      }),
    );
  });

  it('rejects unavailable and unexpected responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ status: 'ready' }, { status: 503 })),
    );
    await expect(requestServiceReadiness(new AbortController().signal)).rejects.toThrow(
      'not ready',
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'healthy' })));
    await expect(requestServiceReadiness(new AbortController().signal)).rejects.toThrow(
      'invalid readiness',
    );
  });

  it('cancels stalled requests after five seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: string, options: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          });
        });
      }),
    );
    const expectation = expect(
      requestServiceReadiness(new AbortController().signal),
    ).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(5_000);
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('forwards lifecycle cancellation and clears the deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: string, options: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          });
        });
      }),
    );
    const cancellationController = new AbortController();
    const expectation = expect(
      requestServiceReadiness(cancellationController.signal),
    ).rejects.toThrow();
    cancellationController.abort();
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });
});
