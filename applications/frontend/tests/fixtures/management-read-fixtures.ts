import assert from 'node:assert/strict';
import { vi } from 'vitest';
import {
  ManagementReadExecution,
  type ManagementReadCompletion,
} from '../../source/management/management-read';

export const ManagementReadFixture = {
  deferred() {
    let resolve: (value: string) => void = () =>
      assert.fail('Deferred request was not initialized.');
    let reject: (error: unknown) => void = () =>
      assert.fail('Deferred request was not initialized.');
    const promise = new Promise<string>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });

    return { promise, resolve, reject };
  },

  execution(request: (signal: AbortSignal) => Promise<string>) {
    const cancellation = new AbortController();
    const onComplete = vi.fn<(result: ManagementReadCompletion<string>) => void>();
    const onUnauthorized = vi.fn<() => void>();
    const resolveError = vi.fn(ManagementReadExecution.errorMessage);

    return {
      cancellation,
      onComplete,
      onUnauthorized,
      resolveError,
      run() {
        return ManagementReadExecution.run({
          request,
          signal: cancellation.signal,
          onComplete,
          onUnauthorized,
          resolveError,
        });
      },
    };
  },
} as const;
