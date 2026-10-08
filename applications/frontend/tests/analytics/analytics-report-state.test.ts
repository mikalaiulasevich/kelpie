import { AnalyticsReportPolicy } from '../../source/analytics/analytics-report-policy';
import { AnalyticsReportStorageFixture } from '../fixtures/analytics-report-storage';
import { describe, expect, it } from 'vitest';
import {
  AnalyticsReportDates,
  AnalyticsReportState,
} from '../../source/analytics/analytics-report-state';
import { AnalyticsReportOperations } from '../../source/analytics/analytics-report-operations';

describe('report periods and shareable filter selection', () => {
  it('keeps an absent denominator distinct from zero and separates the percent unit', () => {
    expect(AnalyticsReportOperations.percentageParts(0, 0)).toEqual([
      { type: 'literal', value: '—' },
    ]);
    expect(AnalyticsReportOperations.percentageParts(0, 7)).toContainEqual({
      type: 'percentSign',
      value: '%',
    });
    const parts = AnalyticsReportOperations.percentageParts(1, 3);
    expect(parts.find((part) => part.type === 'fraction')?.value).toBe('3');
    expect(parts.map((part) => part.value).join('')).toBe(
      AnalyticsReportOperations.percentage(1, 3),
    );
  });

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

  it('starts at the earliest valid instant when local midnight is skipped or repeated', () => {
    expect(AnalyticsReportDates.startOfDay('2026-09-06', 'America/Santiago')).toBe(
      '2026-09-06T04:00:00.000Z',
    );
    expect(AnalyticsReportDates.startOfDay('2026-11-01', 'America/Havana')).toBe(
      '2026-11-01T04:00:00.000Z',
    );
    expect(AnalyticsReportDates.startOfDay('2026-10-08', 'Europe/Minsk')).toBe(
      '2026-10-07T21:00:00.000Z',
    );
    expect(AnalyticsReportDates.startOfDay('2026-10-08', 'Asia/Kathmandu')).toBe(
      '2026-10-07T18:15:00.000Z',
    );
  });

  it('rejects a wholly skipped local calendar date as an empty period', () => {
    expect(
      AnalyticsReportDates.period({
        ...AnalyticsReportState.initial(),
        timezone: 'Pacific/Apia',
        startDate: '2011-12-30',
        endDate: '2011-12-30',
      }),
    ).toBeNull();
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
  it('replaces a saved report only in the same funnel and preserves filter selection', () => {
    const storage = AnalyticsReportStorageFixture.create();
    const selection = AnalyticsReportState.initial(new Date('2026-10-08T12:00:00Z'));
    AnalyticsReportState.save(storage, { name: 'Weekly', funnelIdentifier: 'first', selection });
    AnalyticsReportState.save(storage, { name: 'Weekly', funnelIdentifier: 'second', selection });
    AnalyticsReportState.save(storage, {
      name: 'Weekly',
      funnelIdentifier: 'first',
      selection: { ...selection, sourceSelected: true, source: '' },
    });
    const saved = AnalyticsReportState.saved(storage);
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual({
      name: 'Weekly',
      funnelIdentifier: 'first',
      selection: { ...selection, sourceSelected: true, source: '' },
    });
    expect(saved[1]).toEqual({ name: 'Weekly', funnelIdentifier: 'second', selection });
    expect(selection.sourceSelected).toBe(false);
  });
  it('does not expose corrupted saved calendar periods as runnable reports', () => {
    const storage = AnalyticsReportStorageFixture.create();
    const selection = AnalyticsReportState.initial();
    storage.setItem(
      AnalyticsReportPolicy.SavedReportsKey,
      JSON.stringify([
        {
          name: 'Broken',
          funnelIdentifier: 'first',
          selection: { ...selection, startDate: '2026-02-30', endDate: '2026-03-01' },
        },
      ]),
    );
    expect(AnalyticsReportState.saved(storage)).toEqual([]);
  });
});
