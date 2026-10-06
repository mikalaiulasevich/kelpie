import { match, P } from 'ts-pattern';
import { validateStepContent } from './step-content-validation.js';
import type { AnswerCondition, Condition } from './condition-types.js';
import type { FunnelStep, InteractiveStep, NumberStep, SelectionStep } from './step-types.js';
import type { ConfigurationIssue, FunnelConfiguration } from './configuration-types.js';
import { ConditionOperator, StepType } from './domain-values.js';
import { configurationLimits } from './configuration-document-bounds.js';
import { readOwnProperty } from './dictionary.js';
import { resolveSelectionLimits } from './step-rules.js';

interface ConfigurationValidationContext {
  readonly configuration: FunnelConfiguration;
  readonly issues: ConfigurationIssue[];
  readonly answerSteps: Map<string, InteractiveStep>;
}

function reportIssue(context: ConfigurationValidationContext, path: string, message: string): void {
  if (context.issues.length < configurationLimits.maximumIssues) {
    context.issues.push({ path, message });
  }
}

function visitPredicates(condition: Condition, visit: (predicate: AnswerCondition) => void): void {
  match(condition)
    .with({ all: P._ }, ({ all }) => all.forEach((child) => visitPredicates(child, visit)))
    .with({ any: P._ }, ({ any }) => any.forEach((child) => visitPredicates(child, visit)))
    .with({ answer: P.string }, visit)
    .exhaustive();
}

function reportStepContentIssue(
  context: ConfigurationValidationContext,
  step: FunnelStep,
  path: string,
): void {
  const issue = validateStepContent(step, path);

  if (issue !== undefined) {
    reportIssue(context, issue.path, issue.message);
  }
}

function validateNumericStep(
  context: ConfigurationValidationContext,
  stepIdentifier: string,
  step: NumberStep,
): void {
  if (step.input.min > step.input.max) {
    reportIssue(context, `/steps/${stepIdentifier}/input`, 'Minimum cannot exceed maximum.');
  }

  if (!Number.isFinite((step.input.max - step.input.min) / step.input.step)) {
    reportIssue(
      context,
      `/steps/${stepIdentifier}/input`,
      'Numeric range and increment must support finite arithmetic.',
    );
  }

  if (step.validation.minSelections !== undefined || step.validation.maxSelections !== undefined) {
    reportIssue(
      context,
      `/steps/${stepIdentifier}/validation`,
      'Selection limits do not apply to numeric answers.',
    );
  }
}

function validateSelectionStep(
  context: ConfigurationValidationContext,
  stepIdentifier: string,
  step: SelectionStep,
): void {
  const optionValues = new Set(step.input.options.map((option) => option.value));

  if (optionValues.size !== step.input.options.length) {
    reportIssue(context, `/steps/${stepIdentifier}/input/options`, 'Option values must be unique.');
  }

  if (
    step.type === StepType.SingleSelect &&
    (step.validation.minSelections !== undefined || step.validation.maxSelections !== undefined)
  ) {
    reportIssue(
      context,
      `/steps/${stepIdentifier}/validation`,
      'Selection counts only apply to multi-select.',
    );
  }

  const limits = resolveSelectionLimits(step, optionValues.size);

  if (limits.minimum > limits.maximum || limits.maximum > optionValues.size) {
    reportIssue(
      context,
      `/steps/${stepIdentifier}/validation`,
      'Selection limits must fit available options.',
    );
  }
}

function validateSteps(context: ConfigurationValidationContext): void {
  const { configuration, answerSteps } = context;

  for (const [stepIdentifier, step] of Object.entries(configuration.steps)) {
    if (step.id !== stepIdentifier) {
      reportIssue(
        context,
        `/steps/${stepIdentifier}/id`,
        'Step identifier must match its dictionary key.',
      );
    }

    reportStepContentIssue(context, step, `/steps/${stepIdentifier}/content`);

    if (step.type === StepType.Information) {
      continue;
    }

    if (step.type === StepType.Result) {
      if (step.visibleWhen !== undefined) {
        reportIssue(
          context,
          `/steps/${stepIdentifier}/visibleWhen`,
          'The final result step must always be available.',
        );
      }

      continue;
    }

    if (answerSteps.has(step.input.name)) {
      reportIssue(context, `/steps/${stepIdentifier}/input/name`, 'Answer names must be unique.');
    }

    answerSteps.set(step.input.name, step);

    if (step.type === StepType.Number) {
      validateNumericStep(context, stepIdentifier, step);
    } else {
      validateSelectionStep(context, stepIdentifier, step);
    }
  }
}

function validateCondition(
  context: ConfigurationValidationContext,
  condition: Condition,
  path: string,
  earlierAnswers?: ReadonlySet<string>,
): void {
  visitPredicates(condition, (predicate) => {
    const answerStep = context.answerSteps.get(predicate.answer);

    if (answerStep === undefined) {
      reportIssue(context, path, `Unknown answer reference: ${predicate.answer}.`);

      return;
    }

    if (earlierAnswers !== undefined && !earlierAnswers.has(predicate.answer)) {
      reportIssue(context, path, `Answer ${predicate.answer} must occur earlier in this variant.`);
    }

    const values = Array.isArray(predicate.value) ? predicate.value : [predicate.value];

    if (answerStep.type === StepType.Number) {
      if (
        predicate.operator === ConditionOperator.Contains ||
        values.some((value) => typeof value !== 'number')
      ) {
        reportIssue(
          context,
          path,
          'Numeric conditions require numeric operands and a compatible operator.',
        );
      }
    } else {
      if (
        (predicate.operator === ConditionOperator.Contains) !==
          (answerStep.type === StepType.MultiSelect) ||
        predicate.operator === ConditionOperator.GreaterThanOrEqual
      ) {
        reportIssue(context, path, 'Condition operator does not match the answer type.');
      }

      const availableValues = new Set(answerStep.input.options.map((option) => option.value));

      if (values.some((value) => typeof value !== 'string' || !availableValues.has(value))) {
        reportIssue(context, path, 'Condition refers to an unavailable option.');
      }
    }
  });
}

function validateVariants(context: ConfigurationValidationContext): void {
  const { configuration } = context;

  for (const [variantIdentifier, variant] of Object.entries(configuration.experiment.variants)) {
    const earlierAnswers = new Set<string>();
    const sequenceIdentifiers = new Set(variant.stepSequence);
    let resultCount = 0;

    for (const [position, stepIdentifier] of variant.stepSequence.entries()) {
      const step = readOwnProperty(configuration.steps, stepIdentifier);

      if (step === undefined) {
        reportIssue(
          context,
          `/experiment/variants/${variantIdentifier}/stepSequence`,
          `Unknown step: ${stepIdentifier}.`,
        );
        continue;
      }

      const override = readOwnProperty(variant.stepOverrides, stepIdentifier);

      if (override !== undefined) {
        reportStepContentIssue(
          context,
          { ...step, content: { ...step.content, ...override.content } },
          `/experiment/variants/${variantIdentifier}/stepOverrides/${stepIdentifier}/content`,
        );
      }

      if (step.visibleWhen !== undefined) {
        validateCondition(
          context,
          step.visibleWhen,
          `/steps/${stepIdentifier}/visibleWhen`,
          earlierAnswers,
        );
      }

      if (step.type === StepType.Result) {
        resultCount += 1;

        if (position !== variant.stepSequence.length - 1) {
          reportIssue(
            context,
            `/experiment/variants/${variantIdentifier}/stepSequence`,
            'Result must be the final step.',
          );
        }
      } else if (step.type !== StepType.Information) {
        earlierAnswers.add(step.input.name);
      }
    }

    if (resultCount !== 1) {
      reportIssue(
        context,
        `/experiment/variants/${variantIdentifier}/stepSequence`,
        'Exactly one final result step is required.',
      );
    }

    for (const stepIdentifier of Object.keys(variant.stepOverrides)) {
      if (!sequenceIdentifiers.has(stepIdentifier)) {
        reportIssue(
          context,
          `/experiment/variants/${variantIdentifier}/stepOverrides/${stepIdentifier}`,
          'Override must target a step in this variant.',
        );
      }
    }

    for (const resultIdentifier of Object.keys(variant.resultOverrides)) {
      if (!Object.hasOwn(configuration.results, resultIdentifier)) {
        reportIssue(
          context,
          `/experiment/variants/${variantIdentifier}/resultOverrides/${resultIdentifier}`,
          'Override refers to an unknown result.',
        );
      }
    }
  }

  if (
    configuration.experiment.variants.A.weight + configuration.experiment.variants.B.weight !==
    100
  ) {
    reportIssue(context, '/experiment/variants', 'Variant weights must total 100.');
  }
}

function validateResults(context: ConfigurationValidationContext): void {
  const { configuration } = context;

  for (const [resultIdentifier, result] of Object.entries(configuration.results)) {
    if (result.id !== resultIdentifier) {
      reportIssue(
        context,
        `/results/${resultIdentifier}/id`,
        'Result identifier must match its dictionary key.',
      );
    }
  }

  if (!Object.hasOwn(configuration.results, configuration.defaultResultId)) {
    reportIssue(context, '/defaultResultId', 'Unknown default result.');
  }

  configuration.resultRules.forEach((rule, position) => {
    if (!Object.hasOwn(configuration.results, rule.resultId)) {
      reportIssue(context, `/resultRules/${position}/resultId`, 'Unknown result.');
    }

    validateCondition(context, rule.when, `/resultRules/${position}/when`);
  });
}

function validateEvents(context: ConfigurationValidationContext): void {
  const { configuration } = context;
  const eventNames = new Set(configuration.events.allowed.map((event) => event.name));

  if (eventNames.size !== configuration.events.allowed.length) {
    reportIssue(context, '/events/allowed', 'Event names must be unique.');
  }

  const supportedProperties = new Set([
    'step_type',
    'visible_step_index',
    'visible_step_count',
    'answer_kind',
    'next_step_id',
    'destination_step_id',
    'result_id',
    'action',
    'source',
  ]);
  const supportedBaseProperties = new Set([
    'event_id',
    'session_id',
    'client_timestamp',
    'server_timestamp',
    'funnel_id',
    'funnel_version',
    'experiment_id',
    'variant',
    'step_id',
    'utm_source',
    'utm_medium',
    'utm_campaign',
  ]);

  for (const property of configuration.events.baseProperties) {
    if (!supportedBaseProperties.has(property)) {
      reportIssue(
        context,
        '/events/baseProperties',
        `Unsupported base event property: ${property}.`,
      );
    }
  }

  for (const event of configuration.events.allowed) {
    for (const property of event.properties) {
      if (!supportedProperties.has(property)) {
        reportIssue(context, '/events/allowed', `Unsupported event property: ${property}.`);
      }
    }
  }

  for (const name of [
    'session_started',
    'step_viewed',
    'answer_submitted',
    'step_completed',
    'back_clicked',
    'result_viewed',
    'cta_clicked',
  ]) {
    if (!eventNames.has(name)) {
      reportIssue(context, '/events/allowed', `Required event missing: ${name}.`);
    }
  }
}

export function validateConfigurationSemantics(
  configuration: FunnelConfiguration,
): readonly ConfigurationIssue[] {
  const context: ConfigurationValidationContext = {
    configuration,
    issues: [],
    answerSteps: new Map(),
  };
  validateSteps(context);
  validateVariants(context);
  validateResults(context);
  validateEvents(context);

  return context.issues;
}
