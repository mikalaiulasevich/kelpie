import { isNull } from 'es-toolkit/predicate';
import { AnalyticsPolicy } from './analytics-policy.js';

interface ExperimentSample {
  readonly started: number;
  readonly converted: number;
}

export const AnalyticsExperimentStatistics = {
  interval(sample: ExperimentSample) {
    if (sample.started === 0) {
      return { lower: 0, upper: 1 };
    }

    const proportion = sample.converted / sample.started;
    const square = AnalyticsPolicy.SimultaneousIntervalZ ** 2;
    const divisor = 1 + square / sample.started;
    const center = (proportion + square / (2 * sample.started)) / divisor;
    const margin =
      (AnalyticsPolicy.SimultaneousIntervalZ *
        Math.sqrt(
          (proportion * (1 - proportion) + square / (4 * sample.started)) / sample.started,
        )) /
      divisor;

    return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
  },

  evidence(first: ExperimentSample, second: ExperimentSample, allocation: number) {
    const total = first.started + second.started;
    const expectedFirst = total * allocation;
    const expectedSecond = total - expectedFirst;
    const testable =
      expectedFirst >= AnalyticsPolicy.MinimumExpectedAllocation &&
      expectedSecond >= AnalyticsPolicy.MinimumExpectedAllocation;
    const statistic = testable
      ? (first.started - expectedFirst) ** 2 / expectedFirst +
        (second.started - expectedSecond) ** 2 / expectedSecond
      : null;
    const firstInterval = AnalyticsExperimentStatistics.interval(first);
    const secondInterval = AnalyticsExperimentStatistics.interval(second);
    const observed = first.started > 0 && second.started > 0;

    return {
      difference: observed
        ? second.converted / second.started - first.converted / first.started
        : null,
      lower: observed ? secondInterval.lower - firstInterval.upper : null,
      upper: observed ? secondInterval.upper - firstInterval.lower : null,
      sampleRatioStatistic: statistic,
      sampleRatioMismatch: isNull(statistic)
        ? null
        : statistic > AnalyticsPolicy.SampleRatioMismatchThreshold,
    };
  },
} as const;
