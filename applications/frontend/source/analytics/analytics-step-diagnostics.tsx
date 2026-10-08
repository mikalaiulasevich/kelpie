import { isNull, isUndefined } from 'es-toolkit/predicate';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';
import { useCallback, useState } from 'react';
import type {
  AnalyticsQuery,
  AnalyticsResponse,
  AnalyticsVariant,
} from '../management/management-types';
import { useManagementRead } from '../management/use-management-read';
import { useLocalization } from '../localization/use-localization';
import { Button } from '../components/button';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsSessionClient } from './analytics-session-client';

interface DiagnosticsProperties {
  readonly query: AnalyticsQuery;
  readonly response: AnalyticsResponse;
  readonly variant: AnalyticsVariant;
  readonly stepIdentifier: string;
  readonly onUnauthorized: () => void;
  readonly onSession: (identifier: string) => void;
}

export function AnalyticsStepDiagnostics({
  query,
  response,
  variant,
  stepIdentifier,
  onUnauthorized,
  onSession,
}: DiagnosticsProperties) {
  const { t } = useLocalization();
  const [offset, setOffset] = useState(0);
  const [sequence, setSequence] = useState(0);
  const request = useCallback(
    (signal: AbortSignal) =>
      AnalyticsSessionClient.sessions(
        { ...query, variant: variant.variant, stepIdentifier, limit: 10, offset },
        signal,
      ),
    [query, variant.variant, stepIdentifier, offset],
  );
  const read = useManagementRead(String(sequence), request, onUnauthorized);
  const timing = response.insights?.stepTimings.find(
    (item) =>
      item.versionIdentifier === query.versionIdentifier &&
      item.variant === variant.variant &&
      item.stepIdentifier === stepIdentifier,
  );
  const directions = [
    {
      label: Content.Incoming,
      edges: variant.edges.filter((edge) => edge.toStepIdentifier === stepIdentifier),
    },
    {
      label: Content.Outgoing,
      edges: variant.edges.filter((edge) => edge.fromStepIdentifier === stepIdentifier),
    },
  ];

  return (
    <div className="grid gap-4 border-t bg-muted/20 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        {directions.map((direction) => (
          <section key={direction.label}>
            <h4 className="text-sm font-semibold">{t(direction.label)}</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {direction.edges.map((edge) => (
                <li key={`${edge.fromStepIdentifier}:${edge.toStepIdentifier}`}>
                  <span className="break-all text-muted-foreground">
                    {edge.fromStepIdentifier} → {edge.toStepIdentifier}
                  </span>
                  <span className="ml-2 tabular-nums">{edge.transitions}</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(Content.TransitionRate, {
                      numerator: edge.observedConversion.numerator,
                      denominator: edge.observedConversion.denominator,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(Content.DestinationMissing, {
                      open: edge.destinationNonreach.open,
                      expired: edge.destinationNonreach.expired,
                    })}
                  </p>
                </li>
              ))}
            </ul>
            {direction.edges.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">{t(Content.NoTransitions)}</p>
            )}
          </section>
        ))}
        <section>
          <h4 className="text-sm font-semibold">{t(Content.Duration)}</h4>
          <p className="mt-2 text-sm">
            {!isNull(timing?.averageSeconds) && !isUndefined(timing?.averageSeconds)
              ? t(Content.Seconds, {
                  seconds: timing.averageSeconds.toFixed(1),
                  count: timing.observedSessions,
                })
              : '—'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t(Content.DurationExplanation)}</p>
        </section>
      </div>
      <section>
        <h4 className="text-sm font-semibold">{t(Content.Sessions)}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(Content.TimelineExplanation)} {t(Content.FullHistory)}
        </p>
        {read.status === 'loading' && (
          <p role="status" className="mt-3 text-sm">
            {t(Content.Loading)}
          </p>
        )}
        {read.status === 'error' && (
          <div role="alert" className="mt-3">
            <p>{t(read.message)}</p>
            <Button size="sm" variant="outline" onClick={() => setSequence((value) => value + 1)}>
              {t(Content.Retry)}
            </Button>
          </div>
        )}
        {read.status === 'ready' && (
          <div className="mt-3 space-y-2">
            {read.data.segments.length > 0 && (
              <section className="mb-4 overflow-x-auto">
                <h4 className="mb-2 font-medium">{t(Content.Segment)}</h4>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      {[
                        Content.Source,
                        Content.Medium,
                        Content.Campaign,
                        Content.Views,
                        Content.Completed,
                        Content.Missing,
                      ].map((label) => (
                        <th key={label} className="p-2">
                          {t(label)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {read.data.segments.map((segment) => (
                      <tr
                        key={JSON.stringify([segment.source, segment.medium, segment.campaign])}
                        className="border-t"
                      >
                        <td className="p-2">{segment.source || t(Content.Unattributed)}</td>
                        <td>{segment.medium || t(Content.Unattributed)}</td>
                        <td>{segment.campaign || t(Content.Unattributed)}</td>
                        <td>{segment.reached}</td>
                        <td>
                          {Report.percentage(segment.observedCompleted, segment.reached)} ·{' '}
                          {segment.observedCompleted} / {segment.reached}
                        </td>
                        <td>{segment.completed - segment.observedCompleted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {read.data.segmentsHasMore && (
                  <p className="mt-2 text-xs text-muted-foreground">{t(Content.Truncated)}</p>
                )}
              </section>
            )}

            {read.data.sessions.length === 0 && (
              <p className="text-sm text-muted-foreground">{t(Content.NoSessions)}</p>
            )}
            {read.data.sessions.map((session) => (
              <details className="rounded-lg border bg-card p-3" key={session.sessionIdentifier}>
                <summary className="cursor-pointer text-sm">
                  <span className="font-medium">{session.sessionIdentifier.slice(0, 8)}</span> ·{' '}
                  {Report.timestamp(session.startedAt, response.filters.timezone)} ·{' '}
                  {session.variant}
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="py-2">{t(Content.Timestamp)}</th>
                        <th>{t(Content.Event)}</th>
                        <th>{t(Content.Step)}</th>
                        <th>{t(Content.Source)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.events.map((event, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2">
                            {Report.timestamp(event.occurredAt, response.filters.timezone)}
                          </td>
                          <td>{event.name}</td>
                          <td>{event.stepIdentifier ?? '—'}</td>
                          <td>{event.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {session.eventsHasMore && (
                  <p className="text-xs text-warning">{t(Content.EventsTruncated)}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => onSession(session.sessionIdentifier)}
                >
                  {t(Content.Business)}
                </Button>
              </details>
            ))}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                aria-label={t(Content.PreviousSessions)}
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 10))}
              >
                ←
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!read.data.pagination.hasMore}
                onClick={() => setOffset(offset + 10)}
              >
                {t(Content.More)}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
