import { describe, expect, it } from 'vitest';
import {
  AnalyticsReportDates,
  AnalyticsReportState,
} from '../../source/analytics/analytics-report-state';
import { AnalyticsReportOperations } from '../../source/analytics/analytics-report-operations';

describe('report periods and shareable filter selection', () => {
  it('preserves explicit empty acquisition values and encoded campaigns across links', () => {
    const selection = {
      ...AnalyticsReportState.initial(new Date('2026-10-08T12:00:00Z')),
      timezone: 'Europe/Minsk',
      sourceSelected: true,
      source: '',
      campaignSelected: true,
      campaign: 'launch + ретаргетинг / =2',
      mediumSelected: false,
      medium: 'social',
      trafficOrigin: 'synthetic' as const,
      includeForced: true,
      conversionWindowHours: 72,
    };
    expect(
      AnalyticsReportState.fromHash(AnalyticsReportState.hash('workstyle-planner', selection)),
    ).toEqual(selection);
    expect(AnalyticsReportOperations.query('workstyle-planner', selection)).toMatchObject({
      source: '',
      campaign: 'launch + ретаргетинг / =2',
      trafficOrigin: 'synthetic',
      includeForced: true,
      conversionWindowHours: 72,
    });
    expect(AnalyticsReportOperations.query('workstyle-planner', selection)).not.toHaveProperty(
      'medium',
    );
  });

  it('uses 23 and 25 hour calendar days across DST without shifting the selected dates', () => {
    const selection = { ...AnalyticsReportState.initial(), timezone: 'America/New_York' };
    expect(
      AnalyticsReportDates.period({ ...selection, startDate: '2026-03-08', endDate: '2026-03-08' }),
    ).toEqual({ from: '2026-03-08T05:00:00.000Z', to: '2026-03-09T04:00:00.000Z' });
    expect(
      AnalyticsReportDates.period({ ...selection, startDate: '2026-11-01', endDate: '2026-11-01' }),
    ).toEqual({ from: '2026-11-01T04:00:00.000Z', to: '2026-11-02T05:00:00.000Z' });
  });

  it('rejects invalid calendar dates instead of widening to all-time queries', () => {
    const invalid = {
      ...AnalyticsReportState.initial(),
      startDate: '2026-02-30',
      endDate: '2026-03-01',
    };
    expect(AnalyticsReportDates.period(invalid)).toBeNull();
    expect(() => AnalyticsReportOperations.query('workstyle-planner', invalid)).toThrow();
    expect(
      AnalyticsReportDates.period({
        ...invalid,
        startDate: '2026-03-01',
        timezone: 'not/a/timezone',
      }),
    ).toBeNull();
  });

  it('neutralizes formulas after whitespace and escapes quotes inside CSV cells', () => {
    expect(AnalyticsReportOperations.csvCell(' =1+1')).toBe('"\' =1+1"');
    expect(AnalyticsReportOperations.csvCell('\n=1+1')).toBe('"\'\n=1+1"');
    expect(AnalyticsReportOperations.csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(AnalyticsReportOperations.csvCell('summer "2026", mobile')).toBe(
      '"summer ""2026"", mobile"',
    );
  });
});
