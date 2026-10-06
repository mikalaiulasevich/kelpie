import { vi, type Mock } from 'vitest';
import { ServiceReadinessFixtureMessages } from './service-readiness-messages';

export const ServiceReadinessFixture = {
  browser(): void {
    vi.stubGlobal('location', { origin: 'http://localhost' });
  },

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

  stalledBody(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(new ReadableStream())),
    );
  },

  stalledResponse(): Mock<typeof globalThis.fetch> {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (input) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = input instanceof Request ? input.signal : undefined;

          if (signal === undefined) {
            throw new Error(ServiceReadinessFixtureMessages.CancellationRequired);
          }

          signal.throwIfAborted();
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );
    vi.stubGlobal('fetch', fetch);

    return fetch;
  },
} as const;
