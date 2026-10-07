import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagementClient, ManagementError } from '../../source/management/management-client';
import { ManagementClientFixture } from '../fixtures/management-client-fixtures';
import { ManagementClientCases } from '../cases/management-client-cases';

beforeEach(ManagementClientFixture.browser);

afterEach(() => {
  vi.useRealTimers();
});

describe('management backend client', () => {
  it('requests cookie-authorized configuration pagination and validates metadata', async () => {
    const fetch = ManagementClientFixture.response(ManagementClientFixture.configurations());

    await expect(
      ManagementClient.configurations(
        ManagementClientFixture.query(),
        new AbortController().signal,
      ),
    ).resolves.toEqual(ManagementClientFixture.configurations());
    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);
    expect(request.url).toBe(
      'http://localhost/api/administration/configurations?funnelIdentifier=wellness&limit=25&offset=0',
    );
    expect(request.credentials).toBe('same-origin');
    expect(request.cache).toBe('no-store');
    expect(request.headers.has('x-kelpie-administration')).toBe(false);
  });

  it('serializes analytics filters and validates conditional steps, branches and ratios', async () => {
    const fetch = ManagementClientFixture.response(ManagementClientFixture.analytics());

    await expect(
      ManagementClient.analytics(
        {
          funnelIdentifier: 'wellness',
          includeForced: false,
          trafficOrigin: 'production',
          campaign: 'summer & fall',
        },
        new AbortController().signal,
      ),
    ).resolves.toEqual(ManagementClientFixture.analytics());
    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);
    expect(new URL(request.url).searchParams.get('includeForced')).toBe('false');
    expect(new URL(request.url).searchParams.get('campaign')).toBe('summer & fall');
  });

  it('validates publication history', async () => {
    const body = {
      ...ManagementClientFixture.configurations(),
      items: [ManagementClientFixture.publication()],
    };
    ManagementClientFixture.response(body);

    await expect(
      ManagementClient.history(ManagementClientFixture.query(), new AbortController().signal),
    ).resolves.toEqual(body);
  });

  it('sends the original publication command with CSRF header and no retry', async () => {
    const { fetch, requestBodies } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );

    await ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal);
    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://localhost/api/administration/publications');
    expect(request.headers.get('x-kelpie-administration')).toBe('1');
    expect(await requestBodies[0]).toEqual(ManagementClientFixture.command());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('imports unknown configuration documents and sends rollback without a target', async () => {
    ManagementClientFixture.response({
      outcome: 'created',
      version: ManagementClientFixture.version(),
    });

    await expect(
      ManagementClient.importConfiguration({ schemaVersion: '1' }, new AbortController().signal),
    ).resolves.toMatchObject({ outcome: 'created' });
    const { fetch, requestBodies } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );
    const originalCommand = ManagementClientFixture.command();
    const command = {
      funnelIdentifier: originalCommand.funnelIdentifier,
      operationIdentifier: originalCommand.operationIdentifier,
      expectedRevision: originalCommand.expectedRevision,
    };

    await ManagementClient.rollback(command, new AbortController().signal);
    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);
    expect(request.url).toBe('http://localhost/api/administration/rollbacks');
    expect(await requestBodies[0]).toEqual(command);
  });

  it.each(ManagementClientCases.Errors)(
    'maps $status safely and never retries a mutation',
    async ({ status, code, message, uncertain }) => {
      const fetch = ManagementClientFixture.response(
        { code, message: 'private internal details' },
        status,
      );

      await expect(
        ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal),
      ).rejects.toMatchObject({ status, uncertain, message: expect.stringContaining(message) });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('allowlists conflict codes and bounds issue count and strings without exposing other fields', async () => {
    ManagementClientFixture.response(
      {
        code: 'invalid',
        message: 'private detail',
        issues: [
          { path: '/steps', message: 'Missing result', raw: 'secret' },
          { path: 1, message: 'invalid' },
          ...Array.from({ length: 50 }, () => ({
            path: 'x'.repeat(600),
            message: 'y'.repeat(600),
          })),
        ],
      },
      422,
    );

    try {
      await ManagementClient.importConfiguration({}, new AbortController().signal);
      assert.fail('Expected a validation error');
    } catch (error) {
      assert.ok(error instanceof ManagementError);
      expect(error.code).toBe('invalid');
      expect(error.issues).toHaveLength(29);
      expect(error.issues[0]).toEqual({ path: '/steps', message: 'Missing result' });
      expect(error.issues[1]?.path).toHaveLength(500);
      expect(error.issues[1]?.message).toHaveLength(500);
      expect(error.message).not.toContain('private');
    }
  });

  it('rejects unknown error codes and oversized error bodies', async () => {
    ManagementClientFixture.response(
      { code: 'secret-token', issues: [], message: 'x'.repeat(70_000) },
      409,
    );

    await expect(
      ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal),
    ).rejects.toMatchObject({ status: 409, code: 'request_failed', issues: [] });
  });

  it.each(ManagementClientCases.InvalidResponses)(
    'rejects malformed configuration response %#',
    async (body) => {
      ManagementClientFixture.response(body);

      await expect(
        ManagementClient.configurations(
          ManagementClientFixture.query(),
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code: 'invalid_response', uncertain: false });
    },
  );

  it('marks an invalid successful mutation response as uncertain', async () => {
    ManagementClientFixture.response({ revision: 3 });

    await expect(
      ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal),
    ).rejects.toMatchObject({ code: 'invalid_response', uncertain: true });
  });

  it('rejects malformed analytics nested counters and ratios', async () => {
    const body = ManagementClientFixture.analytics();
    const version = body.versions[0];
    assert.ok(version);
    const variant = version.variants[0];
    assert.ok(variant);
    variant.started = -1;
    ManagementClientFixture.response(body);

    await expect(
      ManagementClient.analytics({ funnelIdentifier: 'wellness' }, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('distinguishes network mutation uncertainty and does not retry', async () => {
    const fetch = ManagementClientFixture.networkFailure();

    await expect(
      ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal),
    ).rejects.toMatchObject({ status: 0, code: 'network', uncertain: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves cancellation before request and during request', async () => {
    const fetch = ManagementClientFixture.stalledResponse();
    const cancellation = new AbortController();
    cancellation.abort();

    await expect(
      ManagementClient.configurations(ManagementClientFixture.query(), cancellation.signal),
    ).rejects.toBe(cancellation.signal.reason);
    expect(fetch).not.toHaveBeenCalled();
    vi.useFakeTimers();
    const activeCancellation = new AbortController();
    const expectation = expect(
      ManagementClient.publish(ManagementClientFixture.command(), activeCancellation.signal),
    ).rejects.toBe(cancellation.signal.reason);

    await vi.advanceTimersByTimeAsync(0);
    activeCancellation.abort(cancellation.signal.reason);
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds stalled error-body reading within the request deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(new ReadableStream(), { status: 503 })),
    );
    const expectation = expect(
      ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal),
    ).rejects.toMatchObject({ status: 0, code: 'timeout', uncertain: true });

    await vi.advanceTimersByTimeAsync(15_000);
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds stalled body reading and preserves mutation uncertainty', async () => {
    vi.useFakeTimers();
    ManagementClientFixture.stalledBody();
    const expectation = expect(
      ManagementClient.publish(ManagementClientFixture.command(), new AbortController().signal),
    ).rejects.toMatchObject({ status: 0, code: 'timeout', uncertain: true });

    await vi.advanceTimersByTimeAsync(15_000);
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });
});
