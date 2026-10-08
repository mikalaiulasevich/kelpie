import { describe, expect, it } from 'vitest';
import { AnalyticsInputs } from '../../source/analytics/analytics-inputs.js';
import { AnalyticsPeriod } from '../../source/analytics/analytics-period.js';

describe('analytics cohort periods', () => {
  it('uses local calendar days across a daylight saving transition', () => {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'example',
      from: '2026-03-08T05:00:00.000Z',
      to: '2026-03-10T04:00:00.000Z',
      timezone: 'America/New_York',
    });
    const days = AnalyticsPeriod.days(query, new Date('2026-04-01T00:00:00Z'));
    expect(days.map((day) => ({ date: day.date, hours: (day.to - day.from) / 3600000 }))).toEqual([
      { date: '2026-03-08', hours: 23 },
      { date: '2026-03-09', hours: 24 },
    ]);
  });

  it('compares equal calendar ranges across spring DST without changing cohort filters', () => {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'example',
      from: '2026-03-08T05:00:00.000Z',
      to: '2026-03-10T04:00:00.000Z',
      timezone: 'America/New_York',
      campaign: 'exact',
      conversionWindowHours: '24',
    });
    expect(AnalyticsPeriod.previous(query)).toEqual({
      ...query,
      from: '2026-03-06T05:00:00.000Z',
      to: '2026-03-08T05:00:00.000Z',
    });
  });

  it('compares the 25-hour autumn day with the complete preceding calendar day', () => {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'example',
      from: '2026-11-01T04:00:00.000Z',
      to: '2026-11-02T05:00:00.000Z',
      timezone: 'America/New_York',
    });
    expect(AnalyticsPeriod.previous(query)).toMatchObject({
      from: '2026-10-31T04:00:00.000Z',
      to: '2026-11-01T04:00:00.000Z',
    });
  });

  it('recognizes a calendar day beginning at 01:00 after a midnight gap', () => {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'example',
      from: '2026-09-06T04:00:00.000Z',
      to: '2026-09-07T03:00:00.000Z',
      timezone: 'America/Santiago',
    });
    expect(AnalyticsPeriod.previous(query)).toMatchObject({
      from: '2026-09-05T04:00:00.000Z',
      to: '2026-09-06T04:00:00.000Z',
    });
    expect(
      AnalyticsPeriod.previous({
        ...query,
        from: '2026-09-07T03:00:00.000Z',
        to: '2026-09-08T03:00:00.000Z',
      }),
    ).toMatchObject({
      from: '2026-09-06T04:00:00.000Z',
      to: '2026-09-07T03:00:00.000Z',
    });
  });

  it('preserves elapsed-duration comparison for arbitrary API timestamp intervals', () => {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'example',
      from: '2026-03-08T06:00:00.000Z',
      to: '2026-03-09T06:00:00.000Z',
      timezone: 'America/New_York',
    });
    expect(AnalyticsPeriod.previous(query)).toMatchObject({
      from: '2026-03-07T06:00:00.000Z',
      to: '2026-03-08T06:00:00.000Z',
    });
  });

  it('rejects unpaired dates, unzoned timestamps and invalid timezones', () => {
    expect(() =>
      AnalyticsInputs.query({ funnelIdentifier: 'example', from: '2026-01-01T00:00:00Z' }),
    ).toThrow();
    expect(() =>
      AnalyticsInputs.query({
        funnelIdentifier: 'example',
        from: '2026-01-01T00:00:00',
        to: '2026-01-02T00:00:00',
      }),
    ).toThrow();
    expect(() =>
      AnalyticsInputs.query({ funnelIdentifier: 'example', timezone: 'not-a-zone' }),
    ).toThrow();
  });
});
