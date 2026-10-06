import {
  StepRules,
  readOwnProperty,
  type FunnelConfiguration,
  type FunnelStep,
  type SessionAnswers,
  type StepAnswer,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { AnswerValidation } from './answer-validation.js';
import { ConditionEvaluation } from './condition-evaluation.js';
import { RuntimeMessages } from './runtime-messages.js';
import { VariantOverrides } from './variant-overrides.js';

export const RouteSteps = {
  resolve(
    configuration: FunnelConfiguration,
    variant: VariantConfiguration,
    identifier: string,
  ): FunnelStep {
    const step = readOwnProperty(configuration.steps, identifier);

    if (step === undefined) {
      throw new Error(RuntimeMessages.ValidatedConfigurationRequired);
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

    const value = readOwnProperty(answers, step.input.name);

    if (value === undefined || !AnswerValidation.validate(step, value).valid) {
      return undefined;
    }

    return { name: step.input.name, value };
  },

  isComplete(step: FunnelStep, answers: SessionAnswers): boolean {
    if (!StepRules.isInteractive(step)) {
      return true;
    }

    return AnswerValidation.validate(step, readOwnProperty(answers, step.input.name)).valid;
  },
} as const;

interface AcceptedStepAnswer {
  readonly name: string;
  readonly value: StepAnswer;
}
