import {
  StepType,
  type ExperimentVariant,
  type FunnelConfiguration,
  type FunnelResult,
  type FunnelStep,
  type SessionAnswers,
  type StepAnswer,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { validateStepAnswer } from './answer-validation.js';
import { evaluateCondition } from './condition-evaluation.js';
import type { AvailableRoute, ResolvedExperimentConfiguration } from './runtime-types.js';

function applyStepOverride(
  stepIdentifier: string,
  step: FunnelStep,
  variant: VariantConfiguration,
): FunnelStep {
  const override = Object.hasOwn(variant.stepOverrides, stepIdentifier)
    ? variant.stepOverrides[stepIdentifier]
    : undefined;

  if (override === undefined) {
    return step;
  }

  return { ...step, content: { ...step.content, ...override.content } };
}

export function resolveExperimentConfiguration(
  configuration: FunnelConfiguration,
  variant: ExperimentVariant,
): ResolvedExperimentConfiguration {
  const selectedVariant = configuration.experiment.variants[variant];
  const steps: Record<string, FunnelStep> = {};

  for (const [identifier, step] of Object.entries(configuration.steps)) {
    steps[identifier] = applyStepOverride(identifier, step, selectedVariant);
  }

  const results: Record<string, FunnelResult> = {};

  for (const [identifier, result] of Object.entries(configuration.results)) {
    const override = Object.hasOwn(selectedVariant.resultOverrides, identifier)
      ? selectedVariant.resultOverrides[identifier]
      : undefined;
    results[identifier] = { ...result, ...override };
  }

  return { variant, stepSequence: selectedVariant.stepSequence, steps, results };
}

/** One sequence traversal. Hidden and invalid answers cannot activate downstream branches. */
export function resolveAvailableSteps(
  configuration: FunnelConfiguration,
  variant: ExperimentVariant,
  answers: SessionAnswers,
): AvailableRoute {
  const selectedVariant = configuration.experiment.variants[variant];
  const availableSteps: FunnelStep[] = [];
  const activeAnswers: Record<string, StepAnswer> = {};
  let questionCount = 0;
  let completedQuestionCount = 0;
  const excludedTypes = new Set(configuration.progress.excludeTypes);

  for (const stepIdentifier of selectedVariant.stepSequence) {
    const originalStep = Object.hasOwn(configuration.steps, stepIdentifier)
      ? configuration.steps[stepIdentifier]
      : undefined;

    if (originalStep === undefined) {
      throw new Error('Runtime requires a validated configuration.');
    }

    const step = applyStepOverride(stepIdentifier, originalStep, selectedVariant);

    if (step.visibleWhen !== undefined && !evaluateCondition(step.visibleWhen, activeAnswers)) {
      continue;
    }

    availableSteps.push(step);
    const countsTowardProgress = !excludedTypes.has(step.type);

    if (countsTowardProgress) {
      questionCount += 1;
    }

    if (step.type === StepType.Information || step.type === StepType.Result) {
      continue;
    }

    const answer = Object.hasOwn(answers, step.input.name) ? answers[step.input.name] : undefined;

    if (answer !== undefined && validateStepAnswer(step, answer).valid) {
      activeAnswers[step.input.name] = answer;

      if (countsTowardProgress) {
        completedQuestionCount += 1;
      }
    }
  }

  return { steps: availableSteps, activeAnswers, questionCount, completedQuestionCount };
}

export function resolveNextStep(
  route: AvailableRoute,
  currentStepIdentifier: string,
): FunnelStep | undefined {
  const currentPosition = route.steps.findIndex((step) => step.id === currentStepIdentifier);

  if (currentPosition < 0) {
    return undefined;
  }

  return route.steps[currentPosition + 1];
}

export function resolvePreviousStep(
  route: AvailableRoute,
  currentStepIdentifier: string,
): FunnelStep | undefined {
  const currentPosition = route.steps.findIndex((step) => step.id === currentStepIdentifier);

  if (currentPosition <= 0) {
    return undefined;
  }

  return route.steps[currentPosition - 1];
}

export function resolveFunnelResult(
  configuration: FunnelConfiguration,
  variant: ExperimentVariant,
  answers: SessionAnswers,
): FunnelResult | undefined {
  const route = resolveAvailableSteps(configuration, variant, answers);

  for (const step of route.steps) {
    if (
      step.type !== StepType.Information &&
      step.type !== StepType.Result &&
      !validateStepAnswer(step, route.activeAnswers[step.input.name]).valid
    ) {
      return undefined;
    }
  }

  const resultIdentifier =
    configuration.resultRules.find((rule) => evaluateCondition(rule.when, route.activeAnswers))
      ?.resultId ?? configuration.defaultResultId;
  const result = Object.hasOwn(configuration.results, resultIdentifier)
    ? configuration.results[resultIdentifier]
    : undefined;
  const overrides = configuration.experiment.variants[variant].resultOverrides;
  const override = Object.hasOwn(overrides, resultIdentifier)
    ? overrides[resultIdentifier]
    : undefined;

  if (result === undefined) {
    return undefined;
  }

  return { ...result, ...override };
}
