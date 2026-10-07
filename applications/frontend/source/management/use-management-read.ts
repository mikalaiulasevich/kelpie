import { useEffect, useEffectEvent, useState } from 'react';
import {
  ManagementReadExecution,
  type ManagementRead,
  type ManagementReadCompletion,
  type ManagementReadErrorMessage,
  type ManagementReadRequest,
} from './management-read';

interface CompletedManagementRead<Result> {
  readonly key: string;
  readonly request: ManagementReadRequest<Result>;
  readonly result: ManagementReadCompletion<Result>;
}

export function useManagementRead<Result>(
  key: string,
  request: ManagementReadRequest<Result>,
  onUnauthorized: () => void,
  resolveError: ManagementReadErrorMessage = ManagementReadExecution.errorMessage,
): ManagementRead<Result> {
  const [completed, setCompleted] = useState<Optional<CompletedManagementRead<Result>>>();
  const handleUnauthorized = useEffectEvent(onUnauthorized);
  const resolveErrorMessage = useEffectEvent(resolveError);

  useEffect(() => {
    const cancellation = new AbortController();

    void ManagementReadExecution.run({
      request,
      signal: cancellation.signal,
      onComplete: (result) => setCompleted({ key, request, result }),
      onUnauthorized: handleUnauthorized,
      resolveError: resolveErrorMessage,
    });

    return () => cancellation.abort();
  }, [key, request]);

  return completed?.key === key && completed.request === request
    ? completed.result
    : { status: 'loading' };
}
