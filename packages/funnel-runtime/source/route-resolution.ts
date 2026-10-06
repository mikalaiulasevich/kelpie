import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelResult,
  FunnelStep,
  SessionAnswers,
  StepAnswer,
} from '@kelpie/contracts';
import { evaluateCondition } from './condition-evaluation.js';
import { validateStepAnswer } from './answer-validation.js';

export interface ResolvedExperimentConfiguration {
  readonly variant: ExperimentVariant;
  readonly stepSequence: readonly string[];
  readonly steps: Readonly<Record<string, FunnelStep>>;
  readonly results: Readonly<Record<string, FunnelResult>>;
}

export function resolveExperimentConfiguration(
  configuration: FunnelConfiguration,
  variant: ExperimentVariant,
): ResolvedExperimentConfiguration {
  const selectedVariant = configuration.experiment.variants[variant];
  const steps: Record<string, FunnelStep> = {};
  for (const [identifier, step] of Object.entries(configuration.steps)) {
    const override = Object.hasOwn(selectedVariant.stepOverrides, identifier)
      ? selectedVariant.stepOverrides[identifier]
      : undefined;
    steps[identifier] =
      override === undefined
        ? step
        : { ...step, content: { ...step.content, ...override.content } };
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

export interface AvailableRoute {
  readonly steps: readonly FunnelStep[];
  readonly activeAnswers: SessionAnswers;
  readonly questionCount: number;
  readonly completedQuestionCount: number;
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
    if (originalStep === undefined) throw new Error('Runtime requires a validated configuration.');
    const override = Object.hasOwn(selectedVariant.stepOverrides, stepIdentifier)
      ? selectedVariant.stepOverrides[stepIdentifier]
      : undefined;
    const step =
      override === undefined
        ? originalStep
        : { ...originalStep, content: { ...originalStep.content, ...override.content } };
    if (step.visibleWhen !== undefined && !evaluateCondition(step.visibleWhen, activeAnswers))
      continue;
    availableSteps.push(step);
    const counted = !excludedTypes.has(step.type);
    if (counted) questionCount += 1;
    if (step.type === 'info' || step.type === 'result') continue;
    const answer = Object.hasOwn(answers, step.input.name) ? answers[step.input.name] : undefined;
    if (answer !== undefined && validateStepAnswer(step, answer).valid) {
      activeAnswers[step.input.name] = answer;
      if (counted) completedQuestionCount += 1;
    }
  }
  return { steps: availableSteps, activeAnswers, questionCount, completedQuestionCount };
}

export function resolveNextStep(
  route: AvailableRoute,
  currentStepIdentifier: string,
): FunnelStep | undefined {
  const currentPosition = route.steps.findIndex((step) => step.id === currentStepIdentifier);
  return currentPosition < 0 ? undefined : route.steps[currentPosition + 1];
}

export function resolvePreviousStep(
  route: AvailableRoute,
  currentStepIdentifier: string,
): FunnelStep | undefined {
  const currentPosition = route.steps.findIndex((step) => step.id === currentStepIdentifier);
  return currentPosition <= 0 ? undefined : route.steps[currentPosition - 1];
}

export function resolveFunnelResult(
  configuration: FunnelConfiguration,
  variant: ExperimentVariant,
  answers: SessionAnswers,
): FunnelResult | undefined {
  const route = resolveAvailableSteps(configuration, variant, answers);
  for (const step of route.steps) {
    if (
      step.type !== 'info' &&
      step.type !== 'result' &&
      !validateStepAnswer(step, route.activeAnswers[step.input.name]).valid
    )
      return undefined;
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
  return result === undefined ? undefined : { ...result, ...override };
}
