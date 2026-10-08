import { describe, expect, it } from 'vitest';
import { AnalyticsReportDraft } from '../../source/analytics/analytics-report-draft';
import { AnalyticsReportState } from '../../source/analytics/analytics-report-state';

describe('pending report period and independently applied filters', () => {
  it('keeps pending period identity when traffic, version and acquisition change', () => {
    const initial = AnalyticsReportState.initial(new Date('2026-10-08T12:00:00Z'));
    const filtered = {
      ...initial,
      trafficOrigin: 'synthetic' as const,
      versionIdentifier: 'other-version',
      source: 'newsletter',
      sourceSelected: true,
      includeForced: true,
    };
    expect(AnalyticsReportDraft.periodKey(filtered)).toBe(AnalyticsReportDraft.periodKey(initial));

    const draft = { ...initial, conversionWindowHours: 72, startDate: '2026-10-01' };
    expect(AnalyticsReportDraft.merge(filtered, draft)).toEqual({
      ...filtered,
      conversionWindowHours: 72,
      startDate: '2026-10-01',
    });
  });

  it('replaces period identity for an explicitly restored report period', () => {
    const initial = AnalyticsReportState.initial(new Date('2026-10-08T12:00:00Z'));
    const restored = AnalyticsReportState.fromHash(
      AnalyticsReportState.hash('workstyle-planner', {
        ...initial,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        timezone: 'Europe/Minsk',
        conversionWindowHours: 168,
      }),
    );
    expect(AnalyticsReportDraft.periodKey(restored)).not.toBe(
      AnalyticsReportDraft.periodKey(initial),
    );
    expect(AnalyticsReportDraft.merge(initial, restored)).toMatchObject({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      timezone: 'Europe/Minsk',
      conversionWindowHours: 168,
    });
  });
});
