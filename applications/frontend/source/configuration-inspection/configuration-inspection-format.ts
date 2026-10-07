import {
  DictionaryAccess,
  type FunnelConfiguration,
  type FunnelResult,
  type FunnelStep,
  type ExperimentVariant,
} from '@kelpie/contracts';

export const ConfigurationInspectionFormat = {
  json(value: unknown): string {
    return JSON.stringify(value, null, 2) ?? 'Not declared';
  },

  stepContent(configuration: FunnelConfiguration, variant: ExperimentVariant, step: FunnelStep) {
    const override = DictionaryAccess.readOwn(
      configuration.experiment.variants[variant].stepOverrides,
      step.id,
    );

    return { ...step.content, ...override?.content };
  },

  result(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    result: FunnelResult,
  ): FunnelResult {
    const override = DictionaryAccess.readOwn(
      configuration.experiment.variants[variant].resultOverrides,
      result.id,
    );

    return { ...result, ...override };
  },
} as const;
