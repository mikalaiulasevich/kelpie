import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import type { BenchmarkCase } from './benchmark-types.js';
import { MeasurementPolicy } from './measurement-policy.js';
import { MeasurementMessages } from './measurement-messages.js';
import type { BenchmarkMeasurementResult } from './measurement-types.js';

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
    const sorted = [...samples].sort((left, right) => left - right);
    const median = sorted[Math.floor(sorted.length / 2)];
    const minimum = sorted[0];
    const maximum = sorted.at(-1);
    assert.ok(
      median !== undefined && minimum !== undefined && maximum !== undefined,
      MeasurementMessages.MissingSamples,
    );

    return {
      name: scenario.name,
      size: scenario.size,
      iterations: scenario.iterations,
      samplesNanosecondsPerOperation: samples,
      medianNanosecondsPerOperation: median,
      minimumNanosecondsPerOperation: minimum,
      maximumNanosecondsPerOperation: maximum,
    };
  },

  run(scenarios: ReadonlyList<BenchmarkCase>): ReadonlyList<BenchmarkMeasurementResult> {
    const identities = new Set<string>();
    const samples = scenarios.map<number[]>(() => []);

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
        const scenario = scenarios[position];
        const durations = samples[position];
        assert.ok(
          scenario !== undefined && durations !== undefined,
          MeasurementMessages.InvalidCase,
        );
        durations.push(BenchmarkMeasurement.sample(scenario, scenario.iterations));
      }
    }

    void measuredResult;

    return scenarios.map((scenario, position) => {
      scenario.verify();

      return BenchmarkMeasurement.summarize(scenario, samples[position] ?? []);
    });
  },
} as const;
