import { isString } from 'es-toolkit';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import { WarmupOperations } from '../../../../scripts/deployment/warmup-operations.mjs';
import { WarmupCases } from '../cases/deployment/warmup-cases.js';

describe('Render warmup', () => {
  it.each(WarmupCases.InvalidOrigins)(
    'rejects an unsafe origin before networking: %s',
    async (origin) => {
      const request = vi.fn<typeof fetch>();
      await expect(WarmupOperations.run(origin, { request })).rejects.toThrow('HTTPS origin');
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('only reads readiness and public entry pages without cookies or mutations', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('{"status":"ready"}', {
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
      )
      .mockResolvedValueOnce(
        new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
      );
    await WarmupOperations.run('https://example.com', { request });
    expect(request.mock.calls.map(([url]) => String(url))).toEqual([
      'https://example.com/api/health/ready',
      'https://example.com/',
      'https://example.com/administration/',
    ]);
    for (const [, options] of request.mock.calls) {
      expect(options).toMatchObject({ method: 'GET', redirect: 'error' });
      expect(options?.headers).not.toHaveProperty('Cookie');
    }
  });

  it.each(WarmupCases.InvalidHealth)('rejects an unhealthy or oversized body', async (body) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/json' } }));
    await expect(WarmupOperations.run('https://example.com', { request })).rejects.toThrow(
      'Readiness response',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rejects a successful HTML fallback at the readiness route', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
      );
    await expect(WarmupOperations.run('https://example.com', { request })).rejects.toThrow(
      'unexpected status or content type',
    );
  });

  it('preserves validation and cleanup failures when an oversized stream cannot be cancelled', async () => {
    const cleanupError = new Error('fixture cancellation failure');
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(4097));
        },

        cancel() {
          throw cleanupError;
        },
      }),
    );
    const failure = await WarmupOperations.health(response).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AggregateError);

    if (!(failure instanceof AggregateError)) {
      expect.fail('Expected both failure causes');
    }

    expect(failure.errors).toHaveLength(2);
    expect(failure.errors[0]).toEqual(
      new Error('Readiness response is invalid or exceeds the response limit.'),
    );
    expect(failure.errors[1]).toBe(cleanupError);
    expect(response.body?.locked).toBe(false);
  });

  it('enforces the deadline while waiting for real HTTP response headers', async () => {
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    expect(address).not.toBeNull();

    if (!address || isString(address)) {
      server.close();

      expect.fail('Expected an isolated TCP address');
    }

    try {
      const request: typeof fetch = (_url, options) =>
        fetch(`http://127.0.0.1:${address.port}`, options);
      await expect(
        WarmupOperations.run('https://example.com', { request, timeoutMilliseconds: 20 }),
      ).rejects.toThrow();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
