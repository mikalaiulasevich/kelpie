import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { platform, arch, cpus } from 'node:os';
import { validateFunnelConfiguration } from '@kelpie/contracts';
import { resolveAvailableSteps, resolveFunnelResult } from '@kelpie/funnel-runtime';

const configurations = [];
for (const version of [1, 2, 3]) {
  const document = JSON.parse(
    await readFile(new URL(`../configurations/funnel-v${version}.json`, import.meta.url), 'utf8'),
  );
  const validation = validateFunnelConfiguration(document);
  if (!validation.valid) throw new Error(`Supplied configuration ${version} is invalid.`);
  configurations.push(validation.configuration);
}

function buildSyntheticAnswers(configuration, includeCompliance) {
  const answers = {};
  for (const step of Object.values(configuration.steps)) {
    if (step.type === 'number') answers[step.input.name] = step.input.min;
    else if (step.type === 'single-select') {
      answers[step.input.name] = step.input.options[0].value;
    } else if (step.type === 'multi-select') {
      const complianceOption = step.input.options.find((option) => option.value === 'compliance');
      const selectedOption =
        includeCompliance && complianceOption ? complianceOption : step.input.options[0];
      answers[step.input.name] = [selectedOption.value];
    }
  }
  return answers;
}

const scenarios = configurations.flatMap((configuration) =>
  ['A', 'B'].flatMap((variant) =>
    [false, true].map((includeCompliance) => ({
      configuration,
      variant,
      answers: buildSyntheticAnswers(configuration, includeCompliance),
    })),
  ),
);

function measure(name, iterations, operation) {
  for (let position = 0; position < 1000; position += 1) operation(position);
  const durationSamples = [];
  for (let sample = 0; sample < 7; sample += 1) {
    const startedAt = performance.now();
    for (let position = 0; position < iterations; position += 1) operation(position);
    durationSamples.push(performance.now() - startedAt);
  }
  durationSamples.sort((left, right) => left - right);
  return {
    name,
    iterationsPerSample: iterations,
    samples: durationSamples.length,
    medianSampleMilliseconds: Number(durationSamples[3].toFixed(3)),
    maximumSampleMilliseconds: Number(durationSamples.at(-1).toFixed(3)),
  };
}

const results = [
  measure('configuration validation', 1000, (position) => {
    const validation = validateFunnelConfiguration(
      configurations[position % configurations.length],
    );
    if (!validation.valid) throw new Error('Configuration validation failed during measurement.');
  }),
  measure('route resolution', 10000, (position) => {
    const scenario = scenarios[position % scenarios.length];
    const route = resolveAvailableSteps(scenario.configuration, scenario.variant, scenario.answers);
    if (route.steps.length === 0) throw new Error('Route resolution failed during measurement.');
  }),
  measure('result resolution', 10000, (position) => {
    const scenario = scenarios[position % scenarios.length];
    const result = resolveFunnelResult(scenario.configuration, scenario.variant, scenario.answers);
    if (result === undefined) throw new Error('Result resolution failed during measurement.');
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
