import { vi, type Mock } from 'vitest';
import { ServiceReadinessFixtureMessages } from './service-readiness-messages';

export const ServiceReadinessFixture = {
  response(body: unknown, status = 200): Mock<typeof globalThis.fetch> {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(body, { status }));
    vi.stubGlobal('fetch', fetch);

    return fetch;
  },

  malformedResponse(): void {
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{')));
  },

  networkFailure(): void {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValue(new TypeError(ServiceReadinessFixtureMessages.NetworkUnavailable)),
    );
  },

  stalledResponse(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = options.signal;
            if (signal === undefined || signal === null) {
              throw new Error(ServiceReadinessFixtureMessages.CancellationRequired);
            }

            signal.throwIfAborted();
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          }),
      ),
    );
  },
} as const;
