import {
  StepRules,
  DictionaryAccess,
  type FunnelConfiguration,
  type FunnelStep,
  type SessionAnswers,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { AnswerValidation } from '../answers/answer-validation.js';
import { ConditionEvaluation } from '../conditions/condition-evaluation.js';
import { RouteMessages } from './route-messages.js';
import { VariantOverrides } from '../experiments/variant-overrides.js';
import type { AcceptedStepAnswer } from './route-types.js';

export const RouteSteps = {
  resolve(
    configuration: FunnelConfiguration,
    variant: VariantConfiguration,
    identifier: string,
  ): FunnelStep {
    const step = DictionaryAccess.readOwn(configuration.steps, identifier);

    if (step === undefined) {
      throw new Error(RouteMessages.ValidatedConfigurationRequired);
    }

    return VariantOverrides.step(identifier, step, variant);
  },

  isVisible(step: FunnelStep, answers: SessionAnswers): boolean {
    return (
      step.visibleWhen === undefined || ConditionEvaluation.evaluate(step.visibleWhen, answers)
    );
  },

  acceptedAnswer(step: FunnelStep, answers: SessionAnswers): Optional<AcceptedStepAnswer> {
    if (!StepRules.isInteractive(step)) {
      return undefined;
    }

    const value = DictionaryAccess.readOwn(answers, step.input.name);

    if (value === undefined || !AnswerValidation.validate(step, value).valid) {
      return undefined;
    }

    return { name: step.input.name, value };
  },

  isComplete(step: FunnelStep, answers: SessionAnswers): boolean {
    if (!StepRules.isInteractive(step)) {
      return true;
    }

    return AnswerValidation.validate(step, DictionaryAccess.readOwn(answers, step.input.name))
      .valid;
  },
} as const;
