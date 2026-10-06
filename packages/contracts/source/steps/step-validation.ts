import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import { StepType } from '../shared/domain-values.js';
import { StepRules } from './step-rules.js';
import type { FunnelStep, InteractiveStep, NumberStep, SelectionStep } from './step-types.js';

export const StepValidation = {
  numeric(context: ConfigurationValidationContext, stepIdentifier: string, step: NumberStep): void {
    if (step.input.min > step.input.max) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).input,
        ConfigurationMessages.InvalidNumericRange,
      );
    }

    if (!Number.isFinite((step.input.max - step.input.min) / step.input.step)) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).input,
        ConfigurationMessages.FiniteNumericArithmeticRequired,
      );
    }

    if (StepRules.hasSelectionLimits(step.validation)) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).validation,
        ConfigurationMessages.NumericSelectionLimits,
      );
    }
  },
  selection(
    context: ConfigurationValidationContext,
    stepIdentifier: string,
    step: SelectionStep,
  ): void {
    const optionValues = context.selectionValues(step);

    if (optionValues.size !== step.input.options.length) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).options,
        ConfigurationMessages.UniqueOptionValuesRequired,
      );
    }

    if (step.type === StepType.SingleSelect && StepRules.hasSelectionLimits(step.validation)) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).validation,
        ConfigurationMessages.MultipleSelectionLimitsRequired,
      );
    }

    const limits = StepRules.selectionLimits(step, optionValues.size);

    if (limits.minimum > limits.maximum || limits.maximum > optionValues.size) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).validation,
        ConfigurationMessages.SelectionLimitsOutsideOptions,
      );
    }
  },
  interactive(
    context: ConfigurationValidationContext,
    stepIdentifier: string,
    step: InteractiveStep,
  ): void {
    if (context.answerSteps.has(step.input.name)) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).answerName,
        ConfigurationMessages.UniqueAnswerNamesRequired,
      );
    }

    context.answerSteps.set(step.input.name, step);

    if (step.type === StepType.Number) {
      StepValidation.numeric(context, stepIdentifier, step);

      return;
    }

    StepValidation.selection(context, stepIdentifier, step);
  },

  step(context: ConfigurationValidationContext, stepIdentifier: string, step: FunnelStep): void {
    if (step.id !== stepIdentifier) {
      context.report(
        ConfigurationPaths.step(stepIdentifier).identifier,
        ConfigurationMessages.StepIdentifierMismatch,
      );
    }

    if (step.type === StepType.Information) {
      return;
    }

    if (step.type === StepType.Result) {
      if (step.visibleWhen !== undefined) {
        context.report(
          ConfigurationPaths.step(stepIdentifier).visibility,
          ConfigurationMessages.UnconditionalResultRequired,
        );
      }

      return;
    }

    StepValidation.interactive(context, stepIdentifier, step);
  },

  validate(context: ConfigurationValidationContext): void {
    for (const [identifier, step] of Object.entries(context.configuration.steps)) {
      StepValidation.step(context, identifier, step);
    }
  },
} as const;
