import { isError } from 'es-toolkit/predicate';
import { ManagementError } from '../management/management-error';
import { AnalyticsMessages } from './analytics-messages';

interface AnalyticsGoalCommandRequest {
  readonly signal: AbortSignal;
  readonly operation: (signal: AbortSignal) => Promise<unknown>;
  readonly onChanged?: Optional<() => void>;
}

type AnalyticsGoalCommandResult =
  | { readonly status: 'saved' | 'failed'; readonly message: string }
  | { readonly status: 'unauthorized' | 'cancelled' };

export const AnalyticsGoalCommand = {
  async run(request: AnalyticsGoalCommandRequest): Promise<AnalyticsGoalCommandResult> {
    if (request.signal.aborted) {
      return { status: 'cancelled' };
    }

    try {
      await request.operation(request.signal);
    } catch (error) {
      if (request.signal.aborted) {
        return { status: 'cancelled' };
      }

      if (error instanceof ManagementError && error.status === 401) {
        return { status: 'unauthorized' };
      }

      return {
        status: 'failed',
        message: isError(error) ? error.message : AnalyticsMessages.SaveFailed,
      };
    }

    if (request.signal.aborted) {
      return { status: 'cancelled' };
    }

    // A refresh failure cannot turn an acknowledged write into a failed save.
    try {
      request.onChanged?.();
    } catch {
      return { status: 'saved', message: AnalyticsMessages.SavedRefreshFailed };
    }

    return { status: 'saved', message: AnalyticsMessages.Saved };
  },
} as const;
