import {
  isInteractiveStep,
  readOwnProperty,
  type FunnelConfiguration,
  type FunnelStep,
  type SessionAnswers,
  type StepAnswer,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { validateStepAnswer } from './answer-validation.js';
import { evaluateCondition } from './condition-evaluation.js';
import { RuntimeMessages } from './runtime-messages.js';
import { VariantOverrides } from './variant-overrides.js';

export const RouteSteps = Object.freeze({
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
    return step.visibleWhen === undefined || evaluateCondition(step.visibleWhen, answers);
  },

  acceptedAnswer(step: FunnelStep, answers: SessionAnswers): Optional<AcceptedStepAnswer> {
    if (!isInteractiveStep(step)) {
      return undefined;
    }

    const value = readOwnProperty(answers, step.input.name);

    if (value === undefined || !validateStepAnswer(step, value).valid) {
      return undefined;
    }

    return { name: step.input.name, value };
  },

  isComplete(step: FunnelStep, answers: SessionAnswers): boolean {
    if (!isInteractiveStep(step)) {
      return true;
    }

    return validateStepAnswer(step, readOwnProperty(answers, step.input.name)).valid;
  },
});

interface AcceptedStepAnswer {
  readonly name: string;
  readonly value: StepAnswer;
}
