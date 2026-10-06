import {
  DictionaryAccess,
  type FunnelResult,
  type FunnelStep,
  type VariantConfiguration,
} from '@kelpie/contracts';

export const VariantOverrides = {
  step(stepIdentifier: string, step: FunnelStep, variant: VariantConfiguration): FunnelStep {
    const override = DictionaryAccess.readOwn(variant.stepOverrides, stepIdentifier);

    if (override === undefined) {
      return step;
    }

    return Object.assign({}, step, { content: { ...step.content, ...override.content } });
  },

  result(result: FunnelResult, variant: VariantConfiguration): FunnelResult {
    const override = DictionaryAccess.readOwn(variant.resultOverrides, result.id);

    return { ...result, ...override };
  },
} as const;
