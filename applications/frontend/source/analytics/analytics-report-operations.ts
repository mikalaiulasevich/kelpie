import type { AnalyticsQuery, AnalyticsResponse } from '../management/management-types';
import { AnalyticsReportDates, type ReportSelection } from './analytics-report-state';

export const AnalyticsReportOperations = {
  query(funnelIdentifier: string, selection: ReportSelection): AnalyticsQuery {
    const period = AnalyticsReportDates.period(selection);

    return {
      funnelIdentifier, ...period, timezone: selection.timezone,
      conversionWindowHours: selection.conversionWindowHours,
      trafficOrigin: selection.trafficOrigin, includeForced: selection.includeForced,
      ...(selection.versionIdentifier ? { versionIdentifier: selection.versionIdentifier } : {}),
      ...(selection.sourceSelected ? { source: selection.source } : {}),
      ...(selection.mediumSelected ? { medium: selection.medium } : {}),
      ...(selection.campaignSelected ? { campaign: selection.campaign } : {}), limit: 1, offset: 0,
    };
  },

  rate(numerator: number, denominator: number): number | null {
    return denominator > 0 ? numerator / denominator * 100 : null;
  },

  percentage(numerator: number, denominator: number): string {
    const value = this.rate(numerator, denominator);

    return value === null ? '—' : `${value.toFixed(1)}%`;
  },

  csvCell(value: TextOrNumber): string {
    const text = String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

    return `"${safe.replaceAll('"', '""')}"`;
  },

  csv(response: AnalyticsResponse): string {
    const rows: TextOrNumber[][] = [
      ['generated_at', response.generatedAt],
      ...Object.entries(response.filters).map(([key, value]) => [key, String(value)]),
      ['version', 'variant', 'step', 'viewed_sessions', 'completed_sessions', 'open_sessions', 'expired_sessions', 'missing_views'],
      ...response.versions.flatMap((version) => version.variants.flatMap((variant) => variant.steps.map((step) => [
        version.funnelVersion, variant.variant, step.stepIdentifier, step.reached,
        ...(step.type === 'result' ? ['', '', '', ''] : [step.completed, step.noncompletion.open, step.noncompletion.expired, step.completed - step.completion.numerator]),
      ]))),
    ];

    return rows.map((row) => row.map((value) => this.csvCell(value)).join(',')).join('\r\n');
  },

  download(response: AnalyticsResponse): void {
    const url = URL.createObjectURL(new Blob([this.csv(response)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kelpie-analytics.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  },
} as const;
