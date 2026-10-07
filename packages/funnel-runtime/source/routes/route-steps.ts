import { isUndefined } from 'es-toolkit/predicate';
import {
  StepRules,
  DictionaryAccess,
  type FunnelConfiguration,
  type FunnelStep,
  type SessionAnswers,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { AnswerValidation } from '../answers/answer-validation.js';
import { AnswerValues } from '../answers/answer-values.js';
import { ConditionEvaluation } from '../conditions/condition-evaluation.js';
import { RouteMessages } from './route-messages.js';
import { VariantOverrides } from '../experiments/variant-overrides.js';
import type { StepAnswerEvaluation } from './route-types.js';

export const RouteSteps = {
  resolve(
    configuration: FunnelConfiguration,
    variant: VariantConfiguration,
    stepIdentifier: string,
  ): FunnelStep {
    const step = DictionaryAccess.readOwn(configuration.steps, stepIdentifier);

    if (isUndefined(step)) {
      throw new Error(RouteMessages.ValidatedConfigurationRequired);
    }

    return VariantOverrides.step(stepIdentifier, step, variant);
  },

  isVisible(step: FunnelStep, answers: SessionAnswers): boolean {
    return isUndefined(step.visibleWhen) || ConditionEvaluation.evaluate(step.visibleWhen, answers);
  },

  evaluateAnswer(step: FunnelStep, answers: SessionAnswers): StepAnswerEvaluation {
    if (!StepRules.isInteractive(step)) {
      return { acceptedAnswer: undefined, isComplete: true };
    }

    const value = DictionaryAccess.readOwn(answers, step.input.name);
    const accepted = !AnswerValues.isMissing(value) && AnswerValidation.validate(step, value).valid;

    // Missing and rejected optional answers stay inactive without preventing a result.
    return {
      acceptedAnswer: accepted ? { name: step.input.name, value } : undefined,
      isComplete: accepted || !step.validation.required,
    };
  },
} as const;
