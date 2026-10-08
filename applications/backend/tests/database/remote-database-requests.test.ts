import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteDatabaseRequestCases } from '../cases/remote-database-request-cases.js';
import { RemoteDatabaseRequestFixture } from '../fixtures/remote-database-request-fixture.js';

// Real stalled sockets prove cancellation covers response bodies after headers arrive.
describe('remote database request deadlines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(RemoteDatabaseRequestCases)(
    'aborts the $name response body at its owned deadline',
    async ({ fetch, timeoutMilliseconds }) => {
      const originalTimeout = AbortSignal.timeout;
      const timeout = vi
        .spyOn(AbortSignal, 'timeout')
        .mockImplementation(() => originalTimeout(1_000));

      await RemoteDatabaseRequestFixture.stalled(async (url) => {
        const response = await fetch(new Request(url));
        await expect(response.text()).rejects.toThrow();
        expect(timeout).toHaveBeenCalledWith(timeoutMilliseconds);
      });
    },
  );

  it.each(RemoteDatabaseRequestCases)(
    'preserves client cancellation during the $name response body',
    async ({ fetch }) => {
      await RemoteDatabaseRequestFixture.stalled(async (url) => {
        const cancellation = new AbortController();
        const response = await fetch(new Request(url, { signal: cancellation.signal }));
        cancellation.abort();
        await expect(response.text()).rejects.toThrow();
      });
    },
  );
});
