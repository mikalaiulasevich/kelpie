import { describe, expect, it, vi } from 'vitest';
import { ManagementError } from '../../source/management/management-error';
import { AnalyticsGoalCommandFixture } from '../fixtures/analytics-goal-command-fixture';
import { ManagementReadFixture } from '../fixtures/management-read-fixtures';

describe('analytics goal save lifecycle', () => {
  it('acknowledges a saved mutation and refreshes once', async () => {
    const operation = vi.fn<(signal: AbortSignal) => Promise<unknown>>(async () => undefined);
    const execution = AnalyticsGoalCommandFixture.execution(operation);

    expect(await execution.run()).toEqual({ status: 'saved', message: 'Saved.' });
    expect(operation).toHaveBeenCalledExactlyOnceWith(execution.cancellation.signal);
    expect(execution.onChanged).toHaveBeenCalledExactlyOnceWith();
  });

  it('does not misreport an acknowledged write when refreshing throws', async () => {
    const execution = AnalyticsGoalCommandFixture.execution(async () => undefined);
    execution.onChanged.mockImplementation(() => {
      throw new Error('Refresh failed');
    });

    expect(await execution.run()).toEqual({
      status: 'saved',
      message: 'Saved, but the report could not refresh. Reload to see the latest data.',
    });
    expect(execution.onChanged).toHaveBeenCalledExactlyOnceWith();
  });

  it('retains a service failure without refreshing or retrying the mutation', async () => {
    const operation = vi.fn(async () => {
      throw new ManagementError('Conflicting outcome', 409, 'conflict');
    });
    const execution = AnalyticsGoalCommandFixture.execution(operation);

    expect(await execution.run()).toEqual({ status: 'failed', message: 'Conflicting outcome' });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(execution.onChanged).not.toHaveBeenCalled();
  });

  it('delegates authorization failure without presenting it as a retryable save', async () => {
    const execution = AnalyticsGoalCommandFixture.execution(async () => {
      throw new ManagementError('Expired', 401, 'unauthorized');
    });

    expect(await execution.run()).toEqual({ status: 'unauthorized' });
    expect(execution.onChanged).not.toHaveBeenCalled();
  });

  it('does not start a mutation after disposal', async () => {
    const operation = vi.fn(async () => undefined);
    const execution = AnalyticsGoalCommandFixture.execution(operation);
    execution.cancellation.abort();

    expect(await execution.run()).toEqual({ status: 'cancelled' });
    expect(operation).not.toHaveBeenCalled();
    expect(execution.onChanged).not.toHaveBeenCalled();
  });

  it('ignores a late acknowledgment even if transport ignores cancellation', async () => {
    const deferred = ManagementReadFixture.deferred();
    const execution = AnalyticsGoalCommandFixture.execution(() => deferred.promise);
    const pending = execution.run();
    execution.cancellation.abort();
    deferred.resolve('Saved remotely');

    expect(await pending).toEqual({ status: 'cancelled' });
    expect(execution.onChanged).not.toHaveBeenCalled();
  });

  it('ignores a stale unauthorized failure after disposal', async () => {
    const deferred = ManagementReadFixture.deferred();
    const execution = AnalyticsGoalCommandFixture.execution(() => deferred.promise);
    const pending = execution.run();
    execution.cancellation.abort();
    deferred.reject(new ManagementError('Expired', 401, 'unauthorized'));

    expect(await pending).toEqual({ status: 'cancelled' });
    expect(execution.onChanged).not.toHaveBeenCalled();
  });

  it('uses the domain fallback for an unexpected rejection', async () => {
    const deferred = ManagementReadFixture.deferred();
    const execution = AnalyticsGoalCommandFixture.execution(() => deferred.promise);
    const pending = execution.run();
    deferred.reject({ unexpected: true });

    expect(await pending).toEqual({
      status: 'failed',
      message: 'Unable to save. Retry with the same details.',
    });
    expect(execution.onChanged).not.toHaveBeenCalled();
  });
});
