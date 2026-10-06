import {
  StepType,
  DictionaryAccess,
  type FunnelResult,
  type FunnelStep,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { match, P } from 'ts-pattern';

export const VariantOverrides = {
  step(stepIdentifier: string, step: FunnelStep, variant: VariantConfiguration): FunnelStep {
    const override = DictionaryAccess.readOwn(variant.stepOverrides, stepIdentifier);

    if (override === undefined) {
      return step;
    }

    return match(step)
      .with({ type: StepType.Information }, (informationStep) => ({
        ...informationStep,
        content: { ...informationStep.content, ...override.content },
      }))
      .with({ type: StepType.Result }, (resultStep) => ({
        ...resultStep,
        content: { ...resultStep.content, ...override.content },
      }))
      .with(
        { type: P.union(StepType.Number, StepType.SingleSelect, StepType.MultiSelect) },
        (interactiveStep) => ({
          ...interactiveStep,
          content: { ...interactiveStep.content, ...override.content },
        }),
      )
      .exhaustive();
  },

  result(result: FunnelResult, variant: VariantConfiguration): FunnelResult {
    const override = DictionaryAccess.readOwn(variant.resultOverrides, result.id);

    return { ...result, ...override };
  },
} as const;
