import { mapValues } from 'es-toolkit/object';
import type { ExperimentVariant, FunnelConfiguration } from '@kelpie/contracts';
import { VariantOverrides } from './variant-overrides.js';
import type { ResolvedExperimentConfiguration } from './experiment-types.js';

export const ExperimentResolution = {
  resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
  ): ResolvedExperimentConfiguration {
    const selectedVariant = configuration.experiment.variants[variant];
    const steps = mapValues(configuration.steps, (step, identifier) =>
      VariantOverrides.step(identifier, step, selectedVariant),
    );
    const results = mapValues(configuration.results, (result) =>
      VariantOverrides.result(result, selectedVariant),
    );

    return { variant, stepSequence: selectedVariant.stepSequence, steps, results };
  },
} as const;
