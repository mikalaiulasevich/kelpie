import {
  StepType,
  isInteractiveStep,
  readOwnProperty,
  type ExperimentVariant,
  type FunnelConfiguration,
  type FunnelResult,
  type FunnelStep,
  type SessionAnswers,
  type StepAnswer,
  type VariantConfiguration,
} from '@kelpie/contracts';
import { match, P } from 'ts-pattern';
import { validateStepAnswer } from './answer-validation.js';
import { evaluateCondition } from './condition-evaluation.js';
import { RuntimeMessages } from './runtime-messages.js';
import type { AvailableRoute, ResolvedExperimentConfiguration } from './runtime-types.js';

function applyStepOverride(
  stepIdentifier: string,
  step: FunnelStep,
  variant: VariantConfiguration,
): FunnelStep {
  const override = readOwnProperty(variant.stepOverrides, stepIdentifier);

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
}

function applyResultOverride(result: FunnelResult, variant: VariantConfiguration): FunnelResult {
  const override = readOwnProperty(variant.resultOverrides, result.id);

  return { ...result, ...override };
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
    results[identifier] = applyResultOverride(result, selectedVariant);
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
    const originalStep = readOwnProperty(configuration.steps, stepIdentifier);

    if (originalStep === undefined) {
      throw new Error(RuntimeMessages.ValidatedConfigurationRequired);
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

    if (!isInteractiveStep(step)) {
      continue;
    }

    const answer = readOwnProperty(answers, step.input.name);

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
): Optional<FunnelStep> {
  const currentPosition = route.steps.findIndex((step) => step.id === currentStepIdentifier);

  if (currentPosition < 0) {
    return undefined;
  }

  return route.steps[currentPosition + 1];
}

export function resolvePreviousStep(
  route: AvailableRoute,
  currentStepIdentifier: string,
): Optional<FunnelStep> {
  const currentPosition = route.steps.findIndex((step) => step.id === currentStepIdentifier);

  if (currentPosition <= 0) {
    return undefined;
  }

  return route.steps[currentPosition - 1];
}

function isStepComplete(step: FunnelStep, answers: SessionAnswers): boolean {
  if (!isInteractiveStep(step)) {
    return true;
  }

  return validateStepAnswer(step, readOwnProperty(answers, step.input.name)).valid;
}

/** Rules are ordered: stop at the first match and never evaluate later rules. */
function selectResultIdentifier(
  configuration: FunnelConfiguration,
  answers: SessionAnswers,
): string {
  for (const rule of configuration.resultRules) {
    if (evaluateCondition(rule.when, answers)) {
      return rule.resultId;
    }
  }

  return configuration.defaultResultId;
}

export function resolveFunnelResult(
  configuration: FunnelConfiguration,
  variant: ExperimentVariant,
  answers: SessionAnswers,
): Optional<FunnelResult> {
  const route = resolveAvailableSteps(configuration, variant, answers);
  const isComplete = route.steps.every((step) => isStepComplete(step, route.activeAnswers));

  if (!isComplete) {
    return undefined;
  }

  const resultIdentifier = selectResultIdentifier(configuration, route.activeAnswers);
  const result = readOwnProperty(configuration.results, resultIdentifier);

  if (result === undefined) {
    return undefined;
  }

  return applyResultOverride(result, configuration.experiment.variants[variant]);
}
