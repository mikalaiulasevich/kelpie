import { describe, expect, it } from 'vitest';
import { AnalyticsReportRead } from '../../source/analytics/analytics-report.js';
import { AnalyticsReportFixture } from '../fixtures/analytics-report-fixture.js';
import { AnalyticsReportCases } from '../cases/analytics-report-cases.js';

describe('shared analytics SQL report envelope', () => {
  it('preserves empty projections as arrays', () => {
    const report = AnalyticsReportRead.project([
      { report: JSON.stringify(AnalyticsReportFixture.empty()) },
    ]);

    expect(report).toEqual({
      summaries: [],
      steps: [],
      edges: [],
      businessOutcomes: [],
      trend: [],
      acquisition: [],
      results: [],
      quality: [],
      stepTimings: [],
    });
  });

  it('preserves the largest safe integer count exactly', () => {
    const report = AnalyticsReportRead.project([{ report: JSON.stringify({
      ...AnalyticsReportFixture.empty(),
      summaries: [{ versionIdentifier: 'version-one', variant: 'A', started: 9007199254740991, results: 0, clicks: 0, resultClicks: 0 }],
    }) }]);

    expect(report.summaries[0]?.started).toBe(9007199254740991);
  });

  it.each(AnalyticsReportCases.InvalidEnvelopes)('rejects $name', ({ rows }) => {
    expect(() => AnalyticsReportRead.project(rows)).toThrow('Analytics aggregate is invalid.');
  });
});
