import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { median } from 'es-toolkit/math';
import type { BenchmarkCase } from './benchmark-types.js';
import { MeasurementPolicy } from './measurement-policy.js';
import { MeasurementMessages } from './measurement-messages.js';
import type { BenchmarkMeasurementResult, BenchmarkSampleCollection } from './measurement-types.js';

// Retain the final result outside each timed batch; correctness checks run separately.
let measuredResult: unknown;

export const BenchmarkMeasurement = {
  sample(scenario: BenchmarkCase, iterations: number): number {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      measuredResult = scenario.run();
    }

    return (
      ((performance.now() - startedAt) * MeasurementPolicy.NanosecondsPerMillisecond) / iterations
    );
  },

  summarize(scenario: BenchmarkCase, samples: ReadonlyList<number>): BenchmarkMeasurementResult {
    assert.ok(samples.length > 0, MeasurementMessages.MissingSamples);

    return {
      name: scenario.name,
      size: scenario.size,
      iterations: scenario.iterations,
      samplesNanosecondsPerOperation: samples,
      medianNanosecondsPerOperation: median(samples),
      minimumNanosecondsPerOperation: Math.min(...samples),
      maximumNanosecondsPerOperation: Math.max(...samples),
    };
  },

  run(scenarios: ReadonlyList<BenchmarkCase>): ReadonlyList<BenchmarkMeasurementResult> {
    const identities = new Set<string>();
    const measurements = scenarios.map<BenchmarkSampleCollection>((scenario) => ({
      scenario,
      samples: [],
    }));

    for (const scenario of scenarios) {
      const identity = `${scenario.name}:${scenario.size}`;
      assert.ok(
        Number.isInteger(scenario.iterations) &&
          scenario.iterations > 0 &&
          !identities.has(identity),
        MeasurementMessages.InvalidCase,
      );
      identities.add(identity);
      scenario.verify();
      BenchmarkMeasurement.sample(scenario, MeasurementPolicy.WarmupIterations);
    }

    // Rotate starting position to distribute warmup, thermal and GC effects across cases.
    for (let round = 0; round < MeasurementPolicy.Samples; round += 1) {
      for (let offset = 0; offset < scenarios.length; offset += 1) {
        const position = (round + offset) % scenarios.length;
        const measurement = measurements[position];
        assert.ok(measurement, MeasurementMessages.InvalidCase);
        const { scenario, samples } = measurement;
        samples.push(BenchmarkMeasurement.sample(scenario, scenario.iterations));
      }
    }

    void measuredResult;

    return measurements.map(({ scenario, samples }) => {
      scenario.verify();

      return BenchmarkMeasurement.summarize(scenario, samples);
    });
  },
} as const;
