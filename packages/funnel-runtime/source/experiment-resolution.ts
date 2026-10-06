import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelResult,
  FunnelStep,
} from '@kelpie/contracts';
import { VariantOverrides } from './variant-overrides.js';
import type { ResolvedExperimentConfiguration } from './runtime-types.js';

export const ExperimentResolution = Object.freeze({
  resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
  ): ResolvedExperimentConfiguration {
    const selectedVariant = configuration.experiment.variants[variant];
    const steps: Record<string, FunnelStep> = {};

    for (const [identifier, step] of Object.entries(configuration.steps)) {
      steps[identifier] = VariantOverrides.step(identifier, step, selectedVariant);
    }

    const results: Record<string, FunnelResult> = {};

    for (const [identifier, result] of Object.entries(configuration.results)) {
      results[identifier] = VariantOverrides.result(result, selectedVariant);
    }

    return { variant, stepSequence: selectedVariant.stepSequence, steps, results };
  },
});
export const resolveExperimentConfiguration = ExperimentResolution.resolve;
