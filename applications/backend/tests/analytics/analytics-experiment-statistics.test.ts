import { describe, expect, it } from 'vitest';
import { AnalyticsExperimentStatistics } from '../../source/analytics/analytics-experiment-statistics.js';

describe('fixed-sample experiment descriptive evidence', () => {
  it('does not infer precision or SRM from tiny or empty samples', () => {
    expect(
      AnalyticsExperimentStatistics.evidence(
        { started: 0, converted: 0 },
        { started: 1, converted: 1 },
        0.5,
      ),
    ).toEqual({
      difference: null,
      lower: null,
      upper: null,
      sampleRatioStatistic: null,
      sampleRatioMismatch: null,
    });
    const tiny = AnalyticsExperimentStatistics.evidence(
      { started: 1, converted: 0 },
      { started: 1, converted: 1 },
      0.5,
    );
    expect(tiny.lower).toBeLessThan(0);
    expect(tiny.upper).toBe(1);
  });

  it('uses configured allocation instead of assuming equal weights', () => {
    expect(
      AnalyticsExperimentStatistics.evidence(
        { started: 900, converted: 90 },
        { started: 100, converted: 10 },
        0.9,
      ),
    ).toMatchObject({ difference: 0, sampleRatioStatistic: 0, sampleRatioMismatch: false });
    expect(
      AnalyticsExperimentStatistics.evidence(
        { started: 900, converted: 90 },
        { started: 100, converted: 10 },
        0.5,
      ),
    ).toMatchObject({ sampleRatioMismatch: true });
  });

  it('returns ordered conservative bounds for an observed B-A difference', () => {
    const evidence = AnalyticsExperimentStatistics.evidence(
      { started: 1000, converted: 100 },
      { started: 1000, converted: 300 },
      0.5,
    );
    expect(evidence.difference).toBeCloseTo(0.2);
    expect(evidence.lower).toBeGreaterThan(0.14);
    expect(evidence.lower).toBeLessThan(0.2);
    expect(evidence.upper).toBeGreaterThan(0.2);
    expect(evidence.upper).toBeLessThan(0.26);
  });
});
