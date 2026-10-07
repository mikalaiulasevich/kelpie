import { isError } from 'es-toolkit/predicate';
import { ManagementError } from './management-error';
import { ManagementMessages } from './management-messages';

export type ManagementRead<Result> =
  Readonly<{ status: 'loading' }> | ManagementReadCompletion<Result>;

export type ManagementReadCompletion<Result> =
  Readonly<{ status: 'ready'; data: Result }> | Readonly<{ status: 'error'; message: string }>;

export type ManagementReadRequest<Result> = (signal: AbortSignal) => Promise<Result>;

export type ManagementReadErrorMessage = (error: unknown) => string;

interface ManagementReadExecution<Result> {
  readonly request: ManagementReadRequest<Result>;
  readonly signal: AbortSignal;
  readonly onComplete: (result: ManagementReadCompletion<Result>) => void;
  readonly onUnauthorized: () => void;
  readonly resolveError: ManagementReadErrorMessage;
}

export const ManagementReadExecution = {
  errorMessage(error: unknown): string {
    return isError(error) ? error.message : ManagementMessages.ReadUnavailable;
  },

  async run<Result>(execution: ManagementReadExecution<Result>): Promise<void> {
    if (execution.signal.aborted) {
      return;
    }

    let completion: ManagementReadCompletion<Result>;

    try {
      const data = await execution.request(execution.signal);
      completion = { status: 'ready', data };
    } catch (error: unknown) {
      if (execution.signal.aborted) {
        return;
      }

      if (error instanceof ManagementError && error.status === 401) {
        execution.onUnauthorized();

        return;
      }

      completion = { status: 'error', message: execution.resolveError(error) };
    }

    if (!execution.signal.aborted) {
      execution.onComplete(completion);
    }
  },
} as const;
