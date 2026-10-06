import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { platform, arch, cpus } from 'node:os';
import { FunnelConfigurations, StepType, ExperimentVariant } from '@kelpie/contracts';
import { BenchmarkPolicy } from './script-policy.mjs';
import { FunnelRuntime } from '@kelpie/funnel-runtime';

const configurations = [];
for (const version of BenchmarkPolicy.configurationVersions) {
  const document = JSON.parse(
    await readFile(new URL(`../configurations/funnel-v${version}.json`, import.meta.url), 'utf8'),
  );
  const validation = FunnelConfigurations.validate(document);
  if (!validation.valid) {
    throw new Error(`Supplied configuration ${version} is invalid.`);
  }

  configurations.push(validation.configuration);
}

function buildSyntheticAnswers(configuration, includeCompliance) {
  const answers = {};
  for (const step of Object.values(configuration.steps)) {
    if (step.type === StepType.Number) {
      answers[step.input.name] = step.input.min;
    } else if (step.type === StepType.SingleSelect) {
      answers[step.input.name] = step.input.options[0].value;
    } else if (step.type === StepType.MultiSelect) {
      const complianceOption = step.input.options.find((option) => option.value === 'compliance');
      const selectedOption =
        includeCompliance && complianceOption ? complianceOption : step.input.options[0];
      answers[step.input.name] = [selectedOption.value];
    }
  }

  return answers;
}

const scenarios = configurations.flatMap((configuration) =>
  Object.values(ExperimentVariant).flatMap((variant) =>
    [false, true].map((includeCompliance) => ({
      configuration,
      variant,
      answers: buildSyntheticAnswers(configuration, includeCompliance),
    })),
  ),
);

function measure(name, iterations, operation) {
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

  return {
    name,
    iterationsPerSample: iterations,
    samples: durationSamples.length,
    medianSampleMilliseconds: Number(
      durationSamples[Math.floor(BenchmarkPolicy.samples / 2)].toFixed(
        BenchmarkPolicy.decimalPlaces,
      ),
    ),
    maximumSampleMilliseconds: Number(
      durationSamples.at(-1).toFixed(BenchmarkPolicy.decimalPlaces),
    ),
  };
}

const results = [
  measure('configuration validation', BenchmarkPolicy.configurationIterations, (position) => {
    const validation = FunnelConfigurations.validate(
      configurations[position % configurations.length],
    );
    if (!validation.valid) {
      throw new Error('Configuration validation failed during measurement.');
    }
  }),
  measure('route resolution', BenchmarkPolicy.runtimeIterations, (position) => {
    const scenario = scenarios[position % scenarios.length];
    const route = FunnelRuntime.Routes.resolve(
      scenario.configuration,
      scenario.variant,
      scenario.answers,
    );
    if (route.steps.length === 0) {
      throw new Error('Route resolution failed during measurement.');
    }
  }),
  measure('result resolution', BenchmarkPolicy.runtimeIterations, (position) => {
    const scenario = scenarios[position % scenarios.length];
    const result = FunnelRuntime.Results.resolve(
      scenario.configuration,
      scenario.variant,
      scenario.answers,
    );
    if (result === undefined) {
      throw new Error('Result resolution failed during measurement.');
    }
  }),
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
