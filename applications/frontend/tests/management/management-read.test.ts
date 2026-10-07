import { describe, expect, it, vi } from 'vitest';
import { ManagementError } from '../../source/management/management-error';
import { ManagementReadFixture } from '../fixtures/management-read-fixtures';

// The hook owns aborting this operation when its request changes or it unmounts.
describe('management read completion ownership', () => {
  it('passes the owned signal and completes an active request', async () => {
    const request = vi.fn<(signal: AbortSignal) => Promise<string>>(async () => 'current response');
    const execution = ManagementReadFixture.execution(request);

    await execution.run();

    expect(request).toHaveBeenCalledWith(execution.cancellation.signal);
    expect(execution.onComplete).toHaveBeenCalledExactlyOnceWith({
      status: 'ready',
      data: 'current response',
    });
    expect(execution.onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not start a request whose owner is already canceled', async () => {
    const request = vi.fn<(signal: AbortSignal) => Promise<string>>(async () => 'unused response');
    const execution = ManagementReadFixture.execution(request);
    execution.cancellation.abort();

    await execution.run();

    expect(request).not.toHaveBeenCalled();
    expect(execution.onComplete).not.toHaveBeenCalled();
  });

  it('ignores a stale response even when the transport does not honor cancellation', async () => {
    const deferred = ManagementReadFixture.deferred();
    const staleExecution = ManagementReadFixture.execution(() => deferred.promise);
    const staleRead = staleExecution.run();
    staleExecution.cancellation.abort();
    const currentExecution = ManagementReadFixture.execution(async () => 'new response');

    await currentExecution.run();
    deferred.resolve('old response');
    await staleRead;

    expect(staleExecution.onComplete).not.toHaveBeenCalled();
    expect(currentExecution.onComplete).toHaveBeenCalledExactlyOnceWith({
      status: 'ready',
      data: 'new response',
    });
  });

  it('ignores a stale unauthorized failure after cancellation', async () => {
    const deferred = ManagementReadFixture.deferred();
    const execution = ManagementReadFixture.execution(() => deferred.promise);
    const read = execution.run();
    execution.cancellation.abort();

    deferred.reject(new ManagementError('Expired session', 401, 'session_expired'));
    await read;

    expect(execution.onUnauthorized).not.toHaveBeenCalled();
    expect(execution.onComplete).not.toHaveBeenCalled();
    expect(execution.resolveError).not.toHaveBeenCalled();
  });

  it('delegates an active unauthorized failure without presenting an ordinary error', async () => {
    const execution = ManagementReadFixture.execution(async () => {
      throw new ManagementError('Expired session', 401, 'session_expired');
    });

    await execution.run();

    expect(execution.onUnauthorized).toHaveBeenCalledExactlyOnceWith();
    expect(execution.onComplete).not.toHaveBeenCalled();
    expect(execution.resolveError).not.toHaveBeenCalled();
  });

  it('retains a service error message', async () => {
    const execution = ManagementReadFixture.execution(async () => {
      throw new ManagementError('Funnel not found', 404, 'not_found');
    });

    await execution.run();

    expect(execution.onComplete).toHaveBeenCalledExactlyOnceWith({
      status: 'error',
      message: 'Funnel not found',
    });
  });

  it('uses the domain fallback for a non-error rejection', async () => {
    const deferred = ManagementReadFixture.deferred();
    const execution = ManagementReadFixture.execution(() => deferred.promise);
    const read = execution.run();
    deferred.reject({ unexpected: true });

    await read;

    expect(execution.onComplete).toHaveBeenCalledExactlyOnceWith({
      status: 'error',
      message: 'Unable to load workspace data.',
    });
  });

  it('allows a page-owned error message without changing cancellation handling', async () => {
    const execution = ManagementReadFixture.execution(async () => {
      throw new Error('Transport diagnostic');
    });
    execution.resolveError.mockReturnValue('Unable to load version options.');

    await execution.run();

    expect(execution.onComplete).toHaveBeenCalledExactlyOnceWith({
      status: 'error',
      message: 'Unable to load version options.',
    });
  });

  it('handles a synchronously thrown request failure through the same error path', async () => {
    const execution = ManagementReadFixture.execution(() => {
      throw new Error('Synchronous request failure');
    });

    await execution.run();

    expect(execution.onComplete).toHaveBeenCalledExactlyOnceWith({
      status: 'error',
      message: 'Synchronous request failure',
    });
  });
});
