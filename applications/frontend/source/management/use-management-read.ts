import { useEffect, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { ManagementError } from './management-client';

export type ManagementRead<Result> =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; data: Result }>
  | Readonly<{ status: 'error'; message: string }>;

type CompletedRead<Result> = Readonly<{ key: string; result: ManagementRead<Result> }>;

export function useManagementRead<Result>(
  key: string,
  request: (signal: AbortSignal) => Promise<Result>,
  onUnauthorized: () => void,
): ManagementRead<Result> {
  const [completed, setCompleted] = useState<Optional<CompletedRead<Result>>>();

  useEffect(() => {
    const cancellation = new AbortController();
    void request(cancellation.signal).then(data => {
      if (!cancellation.signal.aborted) {
        setCompleted({ key, result: { status: 'ready', data } });
      }
    }, error => {
      if (cancellation.signal.aborted) {
        return;
      }

      if (error instanceof ManagementError && error.status === 401) {
        onUnauthorized();

        return;
      }

      setCompleted({ key, result: { status: 'error', message: isError(error) ? error.message : 'Unable to load workspace data.' } });
    });

    return () => cancellation.abort();
  }, [key, request, onUnauthorized]);

  return completed?.key === key ? completed.result : { status: 'loading' };
}
