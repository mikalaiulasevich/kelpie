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

  contentLabel(field: string): string {
    const words = field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

    return words.charAt(0).toUpperCase() + words.slice(1);
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
