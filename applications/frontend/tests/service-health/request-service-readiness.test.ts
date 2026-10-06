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
    const fetch = ServiceReadinessFixture.response({ status: 'ready' });

    await expect(ServiceReadiness.request(new AbortController().signal)).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith(
      ServiceReadinessExpectations.endpoint,
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
    );
  });

  it.each(ServiceReadinessCases.rejectedResponses)(
    'rejects $name',
    async ({ body, status, message }) => {
      ServiceReadinessFixture.response(body, status);

      await expect(ServiceReadiness.request(new AbortController().signal)).rejects.toThrow(message);
    },
  );

  it('cancels a stalled request at its deadline and clears the timer', async () => {
    vi.useFakeTimers();
    ServiceReadinessFixture.stalledResponse();
    const expectation = expect(
      ServiceReadiness.request(new AbortController().signal),
    ).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(ServiceReadinessExpectations.timeoutMilliseconds);
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
