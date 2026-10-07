import { useEffect, useEffectEvent, useState } from 'react';
import { ManagementClient, ManagementError } from '../management/management-client';
import type {
  AnalyticsQuery,
  AnalyticsResponse,
  ConfigurationList,
  ManagementQuery,
} from '../management/management-types';
import { AnalyticsMessages } from './analytics-messages';

type AnalyticsLoadResult<Result> =
  | { readonly status: 'ready'; readonly response: Result }
  | { readonly status: 'failed'; readonly message: string };

type AnalyticsLoadState<Result> = AnalyticsLoadResult<Result> | { readonly status: 'loading' };

interface CompletedAnalyticsRequest<Query, Result> {
  readonly query: Query;
  readonly sequence: number;
  readonly result: AnalyticsLoadResult<Result>;
}

export function useAnalytics(
  query: AnalyticsQuery,
  sequence: number,
  onUnauthorized: () => void,
): AnalyticsLoadState<AnalyticsResponse> {
  const [completedRequest, setCompletedRequest] =
    useState<Optional<CompletedAnalyticsRequest<AnalyticsQuery, AnalyticsResponse>>>();
  const handleUnauthorized = useEffectEvent(onUnauthorized);

  useEffect(() => {
    const cancellationController = new AbortController();

    void ManagementClient.analytics(query, cancellationController.signal).then(
      (response) => {
        if (!cancellationController.signal.aborted) {
          setCompletedRequest({ query, sequence, result: { status: 'ready', response } });
        }
      },
      (error: unknown) => {
        if (cancellationController.signal.aborted) {
          return;
        }

        if (error instanceof ManagementError && error.status === 401) {
          handleUnauthorized();

          return;
        }

        setCompletedRequest({
          query,
          sequence,
          result: {
            status: 'failed',
            message:
              error instanceof ManagementError ? error.message : AnalyticsMessages.Unavailable,
          },
        });
      },
    );

    return () => cancellationController.abort();
  }, [query, sequence]);

  return completedRequest?.query === query && completedRequest.sequence === sequence
    ? completedRequest.result
    : { status: 'loading' };
}

export function useAnalyticsVersionOptions(
  query: ManagementQuery,
  sequence: number,
  onUnauthorized: () => void,
): AnalyticsLoadState<ConfigurationList> {
  const [completedRequest, setCompletedRequest] =
    useState<Optional<CompletedAnalyticsRequest<ManagementQuery, ConfigurationList>>>();
  const handleUnauthorized = useEffectEvent(onUnauthorized);

  useEffect(() => {
    const cancellationController = new AbortController();

    void ManagementClient.configurations(query, cancellationController.signal).then(
      (response) => {
        if (!cancellationController.signal.aborted) {
          setCompletedRequest({ query, sequence, result: { status: 'ready', response } });
        }
      },
      (error: unknown) => {
        if (cancellationController.signal.aborted) {
          return;
        }

        if (error instanceof ManagementError && error.status === 401) {
          handleUnauthorized();

          return;
        }

        setCompletedRequest({
          query,
          sequence,
          result: { status: 'failed', message: AnalyticsMessages.VersionsUnavailable },
        });
      },
    );

    return () => cancellationController.abort();
  }, [query, sequence]);

  return completedRequest?.query === query && completedRequest.sequence === sequence
    ? completedRequest.result
    : { status: 'loading' };
}
