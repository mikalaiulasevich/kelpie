import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { platform, arch, cpus } from 'node:os';
import { FunnelConfigurations, StepType, ExperimentVariant } from '@kelpie/contracts';
import { BenchmarkPolicy, ConfigurationFiles } from './script-policy.mjs';
import { FunnelRuntime } from '@kelpie/funnel-runtime';

/** @type {import('@kelpie/contracts').FunnelConfiguration[]} */
const configurations = [];
for (const version of ConfigurationFiles.versions) {
  const document = JSON.parse(
    await readFile(
      new URL(
        ConfigurationFiles.fileName(version),
        new URL(ConfigurationFiles.directory, import.meta.url),
      ),
      ConfigurationFiles.textEncoding,
    ),
  );
  const validation = FunnelConfigurations.validate(document);
  if (!validation.valid) {
    throw new Error(`Supplied configuration ${version} is invalid.`);
  }

  configurations.push(validation.configuration);
}

const BenchmarkFixtures = {
  /**
   * @param {import('@kelpie/contracts').FunnelConfiguration} configuration
   * @param {boolean} includeCompliance
   */
  answers(configuration, includeCompliance) {
    /** @type {Record<string, import('@kelpie/contracts').StepAnswer>} */
    const answers = {};
    for (const step of Object.values(configuration.steps)) {
      if (step.type === StepType.Number) {
        answers[step.input.name] = step.input.min;
      } else if (step.type === StepType.SingleSelect) {
        const firstOption = step.input.options[0];
        assert.ok(firstOption, 'Validated selection steps must contain options.');
        answers[step.input.name] = firstOption.value;
      } else if (step.type === StepType.MultiSelect) {
        const complianceOption = step.input.options.find(
          (option) => option.value === BenchmarkPolicy.complianceOption,
        );
        const selectedOption =
          includeCompliance && complianceOption ? complianceOption : step.input.options[0];
        assert.ok(selectedOption, 'Validated selection steps must contain options.');
        answers[step.input.name] = [selectedOption.value];
      }
    }

    return answers;
  },
};

const scenarios = configurations.flatMap((configuration) =>
  Object.values(ExperimentVariant).flatMap((variant) =>
    [false, true].map((includeCompliance) => ({
      configuration,
      variant,
      answers: BenchmarkFixtures.answers(configuration, includeCompliance),
    })),
  ),
);

const BenchmarkMeasurement = {
  /**
   * @param {string} name
   * @param {number} iterations
   * @param {(position: number) => void} operation
   */
  measure(name, iterations, operation) {
    for (let position = 0; position < BenchmarkPolicy.warmupIterations; position += 1) {
      operation(position);
    }

    const durationSamples = [];
    for (let sample = 0; sample < BenchmarkPolicy.samples; sample += 1) {
      const startedAt = performance.now();
      for (let position = 0; position < iterations; position += 1) {
        operation(position);
      }

      durationSamples.push(performance.now() - startedAt);
    }

    durationSamples.sort((left, right) => left - right);

    const median = durationSamples[Math.floor(durationSamples.length / 2)];
    const maximum = durationSamples.at(-1);
    assert.ok(median !== undefined && maximum !== undefined, 'At least one sample is required.');

    return {
      name,
      iterationsPerSample: iterations,
      samples: durationSamples.length,
      medianSampleMilliseconds: Number(median.toFixed(BenchmarkPolicy.decimalPlaces)),
      maximumSampleMilliseconds: Number(maximum.toFixed(BenchmarkPolicy.decimalPlaces)),
    };
  },
};

const results = [
  BenchmarkMeasurement.measure(
    'configuration validation',
    BenchmarkPolicy.configurationIterations,
    (position) => {
      const validation = FunnelConfigurations.validate(
        configurations[position % configurations.length],
      );
      if (!validation.valid) {
        throw new Error('Configuration validation failed during measurement.');
      }
    },
  ),
  BenchmarkMeasurement.measure(
    'route resolution',
    BenchmarkPolicy.runtimeIterations,
    (position) => {
      const scenario = scenarios[position % scenarios.length];
      assert.ok(scenario, 'At least one benchmark scenario is required.');
      const route = FunnelRuntime.Routes.resolve(
        scenario.configuration,
        scenario.variant,
        scenario.answers,
      );
      if (route.steps.length === 0) {
        throw new Error('Route resolution failed during measurement.');
      }
    },
  ),
  BenchmarkMeasurement.measure(
    'result resolution',
    BenchmarkPolicy.runtimeIterations,
    (position) => {
      const scenario = scenarios[position % scenarios.length];
      assert.ok(scenario, 'At least one benchmark scenario is required.');
      const result = FunnelRuntime.Results.resolve(
        scenario.configuration,
        scenario.variant,
        scenario.answers,
      );
      if (result === undefined) {
        throw new Error('Result resolution failed during measurement.');
      }
    },
  ),
];

console.info(
  JSON.stringify(
    {
      scope:
        'Pure-function microbenchmark; not application throughput or a deployment capacity claim.',
      environment: {
        node: process.version,
        platform: platform(),
        architecture: arch(),
        processor: cpus()[0]?.model,
      },
      scenarioCount: scenarios.length,
      results,
    },
    null,
    2,
  ),
);
