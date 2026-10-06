import assert from 'node:assert/strict';
import { NetworkError } from 'ky';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceReadiness } from '../../source/service-health/request-service-readiness';
import { ServiceReadinessFixture } from '../fixtures/service-readiness-fixtures';
import {
  ServiceReadinessCases,
  ServiceReadinessExpectations,
} from '../cases/service-readiness-cases';

beforeEach(ServiceReadinessFixture.browser);

afterEach(() => {
  vi.useRealTimers();
});

describe('service readiness', () => {
  it('accepts readiness through an uncached same-origin request', async () => {
    vi.useFakeTimers();
    const fetch = ServiceReadinessFixture.response({ status: 'ready' });

    await expect(ServiceReadiness.request(new AbortController().signal)).resolves.toBeUndefined();

    expect(vi.getTimerCount()).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = fetch.mock.calls[0]?.[0];
    assert.ok(request instanceof Request);

    expect(new URL(request.url).pathname).toBe(ServiceReadinessExpectations.Endpoint);
    expect(new URL(request.url).origin).toBe('http://localhost');
    expect(request.cache).toBe('no-store');
    expect(request.credentials).toBe('same-origin');
    expect(request.headers.get('accept')).toBe('application/json');
  });

  it.each(ServiceReadinessCases.rejectedResponses)(
    'rejects $name',
    async ({ body, status, message }) => {
      vi.useFakeTimers();
      const fetch = ServiceReadinessFixture.response(body, status);

      await expect(ServiceReadiness.request(new AbortController().signal)).rejects.toThrow(message);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('does not send an already-cancelled request or schedule a deadline', async () => {
    vi.useFakeTimers();
    const fetch = ServiceReadinessFixture.response({ status: 'ready' });
    const cancellation = new AbortController();
    cancellation.abort();

    await expect(ServiceReadiness.request(cancellation.signal)).rejects.toBe(
      cancellation.signal.reason,
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the deadline after a network rejection', async () => {
    vi.useFakeTimers();
    ServiceReadinessFixture.networkFailure();

    await expect(ServiceReadiness.request(new AbortController().signal)).rejects.toThrow(
      NetworkError,
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the deadline after malformed response JSON', async () => {
    vi.useFakeTimers();
    ServiceReadinessFixture.malformedResponse();

    await expect(ServiceReadiness.request(new AbortController().signal)).rejects.toThrow(
      SyntaxError,
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a stalled request at its deadline and clears the timer', async () => {
    vi.useFakeTimers();
    ServiceReadinessFixture.stalledResponse();
    const expectation = expect(
      ServiceReadiness.request(new AbortController().signal),
    ).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(ServiceReadinessExpectations.TimeoutMilliseconds);
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds JSON body reading within the overall deadline', async () => {
    vi.useFakeTimers();
    ServiceReadinessFixture.stalledBody();
    const expectation = expect(
      ServiceReadiness.request(new AbortController().signal),
    ).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(ServiceReadinessExpectations.TimeoutMilliseconds);
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });

  it('forwards lifecycle cancellation and clears the deadline', async () => {
    vi.useFakeTimers();
    const fetch = ServiceReadinessFixture.stalledResponse();
    const cancellation = new AbortController();
    const expectation = expect(ServiceReadiness.request(cancellation.signal)).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    cancellation.abort();
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });
});
