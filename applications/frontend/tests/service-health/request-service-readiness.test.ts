import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceReadiness } from '../../source/service-health/request-service-readiness';
import { ServiceReadinessFixture } from '../fixtures/service-readiness-fixtures';
import {
  ServiceReadinessCases,
  ServiceReadinessExpectations,
} from '../cases/service-readiness-cases';

afterEach(() => {
  vi.useRealTimers();
});

describe('service readiness', () => {
  it('accepts readiness through an uncached same-origin request', async () => {
    vi.useFakeTimers();
    const fetch = ServiceReadinessFixture.response({ status: 'ready' });

    await expect(ServiceReadiness.request(new AbortController().signal)).resolves.toBeUndefined();

    expect(vi.getTimerCount()).toBe(0);
    expect(fetch).toHaveBeenCalledWith(
      ServiceReadinessExpectations.Endpoint,
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
    );
  });

  it.each(ServiceReadinessCases.rejectedResponses)(
    'rejects $name',
    async ({ body, status, message }) => {
      vi.useFakeTimers();
      ServiceReadinessFixture.response(body, status);

      await expect(ServiceReadiness.request(new AbortController().signal)).rejects.toThrow(message);

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

    await expect(ServiceReadiness.request(new AbortController().signal)).rejects.toThrow(TypeError);

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

  it('forwards lifecycle cancellation and clears the deadline', async () => {
    vi.useFakeTimers();
    ServiceReadinessFixture.stalledResponse();
    const cancellation = new AbortController();
    const expectation = expect(ServiceReadiness.request(cancellation.signal)).rejects.toThrow();

    cancellation.abort();
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });
});
