import { groupBy } from 'es-toolkit';
import type { AnalyticsInsights } from './analytics-insight-types';
import { Localization } from '../localization/localization';
import { isNull } from 'es-toolkit/predicate';
import { AnalyticsReportContent } from './analytics-report-content';
import type { AnalyticsQuery, AnalyticsResponse } from '../management/management-types';
import { AnalyticsReportDates, type ReportSelection } from './analytics-report-state';

export const AnalyticsReportOperations = {
  publicationsByDay(
    publications: AnalyticsInsights['publications'],
    timezone: string,
  ): Record<string, AnalyticsInsights['publications'][number][]> {
    return groupBy(publications, (publication) =>
      AnalyticsReportDates.dateInTimezone(new Date(publication.occurredAt), timezone),
    );
  },

  timestamp(value: string, timezone?: string): string {
    return new Intl.DateTimeFormat(Localization.formattingLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(new Date(value));
  },

  query(funnelIdentifier: string, selection: ReportSelection): AnalyticsQuery {
    const period = AnalyticsReportDates.period(selection);

    if (isNull(period)) {
      throw new Error(AnalyticsReportContent.InvalidPeriod);
    }

    return {
      funnelIdentifier,
      ...period,
      timezone: selection.timezone,
      conversionWindowHours: selection.conversionWindowHours,
      trafficOrigin: selection.trafficOrigin,
      includeForced: selection.includeForced,
      ...(selection.versionIdentifier ? { versionIdentifier: selection.versionIdentifier } : {}),
      ...(selection.sourceSelected ? { source: selection.source } : {}),
      ...(selection.mediumSelected ? { medium: selection.medium } : {}),
      ...(selection.campaignSelected ? { campaign: selection.campaign } : {}),
      limit: 1,
      offset: 0,
    };
  },

  rate(numerator: number, denominator: number): number | null {
    return denominator > 0 ? (numerator / denominator) * 100 : null;
  },

  percentage(numerator: number, denominator: number): string {
    return this.percentageParts(numerator, denominator)
      .map((part) => part.value)
      .join('');
  },

  percentageParts(numerator: number, denominator: number): Intl.NumberFormatPart[] {
    const value = this.rate(numerator, denominator);

    return isNull(value)
      ? [{ type: 'literal', value: '—' }]
      : new Intl.NumberFormat(Localization.formattingLocale, {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).formatToParts(value / 100);
  },

  cohortDate(value: string): string {
    return new Intl.DateTimeFormat(Localization.formattingLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  },

  csvCell(value: TextOrNumber): string {
    const text = String(value);
    const safe = /^(?:\s*[=+\-@]|[\t\r\n])/.test(text) ? `'${text}` : text;

    return `"${safe.replaceAll('"', '""')}"`;
  },

  csv(response: AnalyticsResponse): string {
    const rows: TextOrNumber[][] = [
      ['generated_at', response.generatedAt],
      ...Object.entries(response.filters).map(([key, value]) => [key, String(value)]),
      [
        'version',
        'variant',
        'step',
        'viewed_sessions',
        'completed_sessions',
        'open_sessions',
        'expired_sessions',
        'missing_views',
      ],
      ...response.versions.flatMap((version) =>
        version.variants.flatMap((variant) =>
          variant.steps.map((step) => [
            version.funnelVersion,
            variant.variant,
            step.stepIdentifier,
            step.reached,
            ...(step.type === 'result'
              ? ['', '', '', '']
              : [
                  step.completed,
                  step.noncompletion.open,
                  step.noncompletion.expired,
                  step.completed - step.completion.numerator,
                ]),
          ]),
        ),
      ),
    ];

    rows.push([], ['version', 'variant', 'started', 'result_viewers', 'recommendation_openers']);
    for (const version of response.versions) {
      for (const variant of version.variants) {
        rows.push([
          version.funnelVersion,
          variant.variant,
          variant.started,
          variant.resultCompletion.numerator,
          variant.ctaConversion.numerator,
        ]);
      }
    }

    if (response.insights) {
      rows.push([], ['cohort_date', 'started', 'result_viewers', 'recommendation_openers']);
      for (const point of response.insights.trend) {
        rows.push([point.date, point.started, point.results, point.clicks]);
      }

      rows.push(
        [],
        ['source', 'medium', 'campaign', 'started', 'result_viewers', 'recommendation_openers'],
      );
      for (const segment of response.insights.acquisition) {
        rows.push([
          segment.source,
          segment.medium,
          segment.campaign,
          segment.started,
          segment.results,
          segment.clicks,
        ]);
      }

      rows.push(['acquisition_truncated', String(response.insights.acquisitionHasMore)]);
      rows.push([], ['outcome', 'sessions', 'manual_sessions', 'integration_sessions']);
      for (const outcome of response.insights.businessOutcomes) {
        rows.push([
          outcome.kind,
          outcome.sessions,
          outcome.manualSessions,
          outcome.integrationSessions,
        ]);
      }
    }

    return rows.map((row) => row.map((value) => this.csvCell(value)).join(',')).join('\r\n');
  },

  download(response: AnalyticsResponse): void {
    const url = URL.createObjectURL(
      new Blob([this.csv(response)], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kelpie-analytics.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  },
} as const;
