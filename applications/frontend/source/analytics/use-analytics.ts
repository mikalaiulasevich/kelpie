import { useCallback } from 'react';
import { ManagementClient, ManagementError } from '../management/management-client';
import type {
  AnalyticsQuery,
  AnalyticsResponse,
  ConfigurationList,
  ManagementQuery,
} from '../management/management-types';
import type { ManagementRead } from '../management/management-read';
import { useManagementRead } from '../management/use-management-read';
import { AnalyticsMessages } from './analytics-messages';

type AnalyticsLoadState<Result> =
  | { readonly status: 'ready'; readonly response: Result }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'loading' };

const AnalyticsReadPresentation = {
  state<Result>(read: ManagementRead<Result>): AnalyticsLoadState<Result> {
    if (read.status === 'ready') {
      return { status: 'ready', response: read.data };
    }

    if (read.status === 'error') {
      return { status: 'failed', message: read.message };
    }

    return read;
  },

  error(error: unknown): string {
    return error instanceof ManagementError ? error.message : AnalyticsMessages.Unavailable;
  },

  versionError(): string {
    return AnalyticsMessages.VersionsUnavailable;
  },
} as const;

export function useAnalytics(
  query: AnalyticsQuery,
  sequence: number,
  onUnauthorized: () => void,
): AnalyticsLoadState<AnalyticsResponse> {
  const request = useCallback(
    (signal: AbortSignal) => ManagementClient.analytics(query, signal),
    [query],
  );
  const read = useManagementRead(
    String(sequence),
    request,
    onUnauthorized,
    AnalyticsReadPresentation.error,
  );

  return AnalyticsReadPresentation.state(read);
}

export function useAnalyticsVersionOptions(
  query: ManagementQuery,
  sequence: number,
  onUnauthorized: () => void,
): AnalyticsLoadState<ConfigurationList> {
  const request = useCallback(
    (signal: AbortSignal) => ManagementClient.configurations(query, signal),
    [query],
  );
  const read = useManagementRead(
    String(sequence),
    request,
    onUnauthorized,
    AnalyticsReadPresentation.versionError,
  );

  return AnalyticsReadPresentation.state(read);
}
