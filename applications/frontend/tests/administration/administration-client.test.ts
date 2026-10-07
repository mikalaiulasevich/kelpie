import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdministrationClient } from '../../source/administration/administration-client';
import { AdministrationClientFixture } from '../fixtures/administration-client-fixtures';
import { AdministrationClientCases } from '../cases/administration-client-cases';

beforeEach(AdministrationClientFixture.browser);

afterEach(() => {
  vi.useRealTimers();
});

describe('administration client', () => {
  it('sends sign-in credentials and CSRF verification to the same-origin backend', async () => {
    const { fetch, requestBodies } = AdministrationClientFixture.signInResponse(
      AdministrationClientFixture.identity(),
    );

    await expect(
      AdministrationClient.signIn(
        AdministrationClientFixture.credentials(),
        new AbortController().signal,
      ),
    ).resolves.toEqual({ identifier: 'administrator-1', username: 'administrator' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);

    expect(request.url).toBe('http://localhost/api/administration/sign-in');
    expect(request.method).toBe('POST');
    expect(request.credentials).toBe('same-origin');
    expect(request.cache).toBe('no-store');
    expect(request.headers.get('x-kelpie-administration')).toBe('1');
    expect(request.headers.get('content-type')).toBe('application/json');
    expect(await requestBodies[0]).toEqual({
      username: 'administrator',
      password: 'a-secret-test-password',
    });
  });

  it('restores an authenticated session without sending credentials', async () => {
    const fetch = AdministrationClientFixture.response(AdministrationClientFixture.identity());

    await expect(AdministrationClient.session(new AbortController().signal)).resolves.toEqual({
      identifier: 'administrator-1',
      username: 'administrator',
    });

    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);

    expect(request.url).toBe('http://localhost/api/administration/session');
    expect(request.method).toBe('GET');
    expect(request.credentials).toBe('same-origin');
    expect(request.cache).toBe('no-store');
    expect(request.headers.has('x-kelpie-administration')).toBe(false);
    expect(request.body).toBeNull();
  });

  it('treats an expired session as signed out even with malformed error JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{', { status: 401 })),
    );

    await expect(AdministrationClient.session(new AbortController().signal)).resolves.toBeNull();
  });

  it.each(AdministrationClientCases.SignInFailures)(
    'reports $name without retrying sign-in or exposing the backend body',
    async ({ status, message }) => {
      const fetch = AdministrationClientFixture.response(
        { message: 'internal secret failure details' },
        status,
      );

      await expect(
        AdministrationClient.signIn(
          AdministrationClientFixture.credentials(),
          new AbortController().signal,
        ),
      ).rejects.toThrow(message);

      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each(AdministrationClientCases.InvalidIdentities)(
    'rejects a $name identity from sign-in and session',
    async ({ body }) => {
      AdministrationClientFixture.response(body);

      await expect(
        AdministrationClient.signIn(
          AdministrationClientFixture.credentials(),
          new AbortController().signal,
        ),
      ).rejects.toThrow('invalid response');
      AdministrationClientFixture.response(body);
      await expect(AdministrationClient.session(new AbortController().signal)).rejects.toThrow(
        'invalid response',
      );
    },
  );

  it('sends sign-out with cookie credentials and CSRF verification', async () => {
    const fetch = AdministrationClientFixture.signedOut();

    await expect(
      AdministrationClient.signOut(new AbortController().signal),
    ).resolves.toBeUndefined();

    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);

    expect(request.url).toBe('http://localhost/api/administration/sign-out');
    expect(request.method).toBe('POST');
    expect(request.credentials).toBe('same-origin');
    expect(request.headers.get('x-kelpie-administration')).toBe('1');
    expect(request.body).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(AdministrationClientCases.SignOutFailures)(
    'preserves sign-out $name without retrying',
    async ({ status, message }) => {
      const fetch = AdministrationClientFixture.response({}, status);

      await expect(AdministrationClient.signOut(new AbortController().signal)).rejects.toThrow(
        message,
      );

      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('completes sign-out when the server session has already expired', async () => {
    const fetch = AdministrationClientFixture.response({}, 401);

    await expect(
      AdministrationClient.signOut(new AbortController().signal),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves network failure during sign-out without retrying', async () => {
    const fetch = AdministrationClientFixture.networkFailure();

    await expect(AdministrationClient.signOut(new AbortController().signal)).rejects.toThrow(
      'unavailable',
    );

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects sign-out responses that do not match the no-content contract', async () => {
    AdministrationClientFixture.response({});

    await expect(AdministrationClient.signOut(new AbortController().signal)).rejects.toThrow(
      'invalid response',
    );
  });

  it('preserves pre-request cancellation without fetching', async () => {
    const fetch = AdministrationClientFixture.response({});
    const cancellation = new AbortController();
    cancellation.abort();

    await expect(
      AdministrationClient.signIn(AdministrationClientFixture.credentials(), cancellation.signal),
    ).rejects.toBe(cancellation.signal.reason);
    await expect(AdministrationClient.session(cancellation.signal)).rejects.toBe(
      cancellation.signal.reason,
    );
    await expect(AdministrationClient.signOut(cancellation.signal)).rejects.toBe(
      cancellation.signal.reason,
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves in-flight cancellation and clears the deadline', async () => {
    vi.useFakeTimers();
    AdministrationClientFixture.stalledResponse();
    const cancellation = new AbortController();
    const cancellationReason = new DOMException('Cancelled', 'AbortError');
    const expectation = expect(AdministrationClient.session(cancellation.signal)).rejects.toBe(
      cancellationReason,
    );

    await vi.advanceTimersByTimeAsync(0);
    cancellation.abort(cancellationReason);
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });

  it('maps network failure to a safe message with no mutation retry', async () => {
    const fetch = AdministrationClientFixture.networkFailure();

    await expect(
      AdministrationClient.signIn(
        AdministrationClientFixture.credentials(),
        new AbortController().signal,
      ),
    ).rejects.toThrow('unavailable');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps malformed response JSON to a safe error', async () => {
    AdministrationClientFixture.malformedResponse();

    await expect(
      AdministrationClient.signIn(
        AdministrationClientFixture.credentials(),
        new AbortController().signal,
      ),
    ).rejects.toThrow('invalid response');
  });

  it('bounds stalled body reading within the total deadline', async () => {
    vi.useFakeTimers();
    AdministrationClientFixture.stalledBody();
    const expectation = expect(
      AdministrationClient.signIn(
        AdministrationClientFixture.credentials(),
        new AbortController().signal,
      ),
    ).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(10_000);
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });
});
