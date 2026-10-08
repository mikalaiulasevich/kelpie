import { isNull, isString } from 'es-toolkit/predicate';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteDatabaseRequests } from '../../source/database/remote-database-requests.js';

// A real stalled socket proves cancellation covers network IO, including response bodies.
describe('remote database request deadlines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aborts a stalled response body after receiving headers', async () => {
    const originalTimeout = AbortSignal.timeout;
    const timeout = vi
      .spyOn(AbortSignal, 'timeout')
      .mockImplementation(() => originalTimeout(1_000));
    const server = createServer((_request, response) => {
      response.writeHead(200);
      response.write('partial response');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address();

      if (isNull(address) || isString(address)) {
        throw new Error('Expected a listening TCP address.');
      }

      const response = await RemoteDatabaseRequests.fetch(
        new Request(`http://127.0.0.1:${address.port}`),
      );
      await expect(response.text()).rejects.toThrow();
      expect(timeout).toHaveBeenCalledWith(30_000);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('preserves cancellation requested by the database client', async () => {
    const cancellation = new AbortController();
    cancellation.abort();
    await expect(
      RemoteDatabaseRequests.fetch(
        new Request('https://example.invalid', { signal: cancellation.signal }),
      ),
    ).rejects.toThrow();
  });
});
