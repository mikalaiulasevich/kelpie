import { describe, expect, it } from 'vitest';
import { BenchmarkMeasurement } from './benchmark-measurement.js';
import { MeasurementPolicy } from './measurement-policy.js';
import { MeasurementCases } from '../cases/measurement-cases.js';
import { MeasurementFixtures } from '../fixtures/measurement-fixtures.js';

describe('benchmark measurement', () => {
  it.each(MeasurementCases.summaries)('summarizes $description without mutation', (scenario) => {
    const samples = Object.freeze([...scenario.samples]);

    const result = BenchmarkMeasurement.summarize(MeasurementFixtures.scenario(), samples);

    expect(result).toMatchObject({
      samplesNanosecondsPerOperation: scenario.samples,
      medianNanosecondsPerOperation: scenario.median,
      minimumNanosecondsPerOperation: scenario.minimum,
      maximumNanosecondsPerOperation: scenario.maximum,
    });
  });

  it('rejects missing samples before calculating statistics', () => {
    expect(() => BenchmarkMeasurement.summarize(MeasurementFixtures.scenario(), [])).toThrow(
      'Benchmark measurement requires duration samples.',
    );
  });

  it('keeps each scenario paired with its samples and verifies before and after measurement', () => {
    const first = MeasurementFixtures.scenario();
    const second = MeasurementFixtures.scenario({ name: 'measurement.second' });

    const results = BenchmarkMeasurement.run([first, second]);

    expect(results.map((result) => result.name)).toEqual([
      'measurement.fixture',
      'measurement.second',
    ]);
    expect(results.map((result) => result.samplesNanosecondsPerOperation.length)).toEqual([
      MeasurementPolicy.Samples,
      MeasurementPolicy.Samples,
    ]);
    expect(first.verify).toHaveBeenCalledTimes(2);
    expect(second.verify).toHaveBeenCalledTimes(2);
    expect(first.run).toHaveBeenCalledTimes(
      MeasurementPolicy.WarmupIterations + MeasurementPolicy.Samples,
    );
    expect(second.run).toHaveBeenCalledTimes(
      MeasurementPolicy.WarmupIterations + MeasurementPolicy.Samples,
    );
  });
});
