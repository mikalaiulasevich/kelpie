import { Ajv } from 'ajv';
import type {
  Condition,
  ConfigurationIssue,
  ConfigurationValidationResult,
  FunnelConfiguration,
  FunnelStep,
} from './configuration-types.js';
import { funnelConfigurationSchema } from './configuration-schema.js';

export const configurationLimits = Object.freeze({
  maximumDocumentBytes: 262144,
  maximumDepth: 24,
  maximumNodes: 20000,
  maximumIssues: 30,
});
const structuralValidator = new Ajv({
  allErrors: false,
  strict: true,
  allowUnionTypes: true,
  ownProperties: true,
}).compile<FunnelConfiguration>(funnelConfigurationSchema);

function checkDocumentBounds(document: unknown): string | undefined {
  const pending: { value: unknown; depth: number }[] = [{ value: document, depth: 0 }];
  const visited = new WeakSet<object>();
  let nodes = 0;
  let estimatedBytes = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    nodes += 1;
    if (
      nodes > configurationLimits.maximumNodes ||
      current.depth > configurationLimits.maximumDepth
    )
      return 'Document exceeds nesting or node limits.';
    if (typeof current.value === 'string') estimatedBytes += current.value.length * 3;
    else if (typeof current.value === 'number' && !Number.isFinite(current.value))
      return 'Numbers must be finite.';
    else if (current.value !== null && typeof current.value === 'object') {
      const prototype: unknown = Object.getPrototypeOf(current.value);
      if (!Array.isArray(current.value) && prototype !== Object.prototype && prototype !== null)
        return 'Document objects must be plain JSON objects.';
      if (visited.has(current.value))
        return 'Document must be an acyclic JSON value without shared object references.';
      visited.add(current.value);
      const keys = Object.keys(current.value);
      if (keys.length > configurationLimits.maximumNodes)
        return 'Document contains too many properties.';
      for (const [key, value] of Object.entries(current.value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype')
          return 'Reserved object keys are not allowed.';
        estimatedBytes += key.length * 3 + 8;
        pending.push({ value, depth: current.depth + 1 });
      }
    } else if (current.value !== null && !['boolean', 'number'].includes(typeof current.value))
      return 'Document contains a non-JSON value.';
    if (estimatedBytes > configurationLimits.maximumDocumentBytes)
      return 'Document exceeds the size limit.';
  }
  return undefined;
}

function visitPredicates(
  condition: Condition,
  visit: (predicate: Extract<Condition, { answer: string }>) => void,
): void {
  if ('all' in condition) condition.all.forEach((child) => visitPredicates(child, visit));
  else if ('any' in condition) condition.any.forEach((child) => visitPredicates(child, visit));
  else visit(condition);
}

export function validateFunnelConfiguration(document: unknown): ConfigurationValidationResult {
  const boundsError = checkDocumentBounds(document);
  if (boundsError !== undefined)
    return { valid: false, issues: [{ path: '/', message: boundsError }] };
  if (!structuralValidator(document))
    return {
      valid: false,
      issues: (structuralValidator.errors ?? [])
        .slice(0, configurationLimits.maximumIssues)
        .map((error) => ({
          path: error.instancePath || '/',
          message: error.message ?? 'Invalid configuration.',
        })),
    };
  const configuration = document;
  const issues: ConfigurationIssue[] = [];
  const report = (path: string, message: string) => {
    if (issues.length < configurationLimits.maximumIssues) issues.push({ path, message });
  };
  const checkStepContent = (step: FunnelStep, path: string): void => {
    if (step.type === 'info') {
      if (
        !step.content.title?.trim() ||
        !step.content.body?.trim() ||
        !step.content.primaryActionLabel?.trim()
      )
        report(path, 'Information steps require title, body, and primary action label.');
    } else if (step.type !== 'result' && !step.content.title?.trim())
      report(`${path}/title`, 'Interactive steps require a title.');
  };
  const answerSteps = new Map<string, FunnelStep>();
  for (const [stepIdentifier, step] of Object.entries(configuration.steps)) {
    if (step.id !== stepIdentifier)
      report(`/steps/${stepIdentifier}/id`, 'Step identifier must match its dictionary key.');
    checkStepContent(step, `/steps/${stepIdentifier}/content`);
    if (step.type === 'info') {
      continue;
    }
    if (step.type === 'result') {
      if (step.visibleWhen !== undefined)
        report(
          `/steps/${stepIdentifier}/visibleWhen`,
          'The final result step must always be available.',
        );
      continue;
    }
    if (answerSteps.has(step.input.name))
      report(`/steps/${stepIdentifier}/input/name`, 'Answer names must be unique.');
    answerSteps.set(step.input.name, step);
    if (step.type === 'number') {
      if (step.input.min > step.input.max)
        report(`/steps/${stepIdentifier}/input`, 'Minimum cannot exceed maximum.');
      if (!Number.isFinite((step.input.max - step.input.min) / step.input.step))
        report(
          `/steps/${stepIdentifier}/input`,
          'Numeric range and increment must support finite arithmetic.',
        );
      if (
        step.validation.minSelections !== undefined ||
        step.validation.maxSelections !== undefined
      )
        report(
          `/steps/${stepIdentifier}/validation`,
          'Selection limits do not apply to numeric answers.',
        );
    } else {
      const optionValues = new Set(step.input.options.map((option) => option.value));
      if (optionValues.size !== step.input.options.length)
        report(`/steps/${stepIdentifier}/input/options`, 'Option values must be unique.');
      if (
        step.type === 'single-select' &&
        (step.validation.minSelections !== undefined || step.validation.maxSelections !== undefined)
      )
        report(
          `/steps/${stepIdentifier}/validation`,
          'Selection counts only apply to multi-select.',
        );
      const minimum = step.validation.minSelections ?? (step.validation.required ? 1 : 0);
      const maximum = step.validation.maxSelections ?? optionValues.size;
      if (minimum > maximum || maximum > optionValues.size)
        report(
          `/steps/${stepIdentifier}/validation`,
          'Selection limits must fit available options.',
        );
    }
  }
  const checkCondition = (condition: Condition, path: string, earlierAnswers?: Set<string>) =>
    visitPredicates(condition, (predicate) => {
      const answerStep = answerSteps.get(predicate.answer);
      if (answerStep === undefined || answerStep.type === 'info' || answerStep.type === 'result') {
        report(path, `Unknown answer reference: ${predicate.answer}.`);
        return;
      }
      if (earlierAnswers !== undefined && !earlierAnswers.has(predicate.answer))
        report(path, `Answer ${predicate.answer} must occur earlier in this variant.`);
      const values = Array.isArray(predicate.value) ? predicate.value : [predicate.value];
      if (answerStep.type === 'number') {
        if (predicate.operator === 'contains' || values.some((value) => typeof value !== 'number'))
          report(path, 'Numeric conditions require numeric operands and a compatible operator.');
      } else {
        if (
          (predicate.operator === 'contains') !== (answerStep.type === 'multi-select') ||
          predicate.operator === 'gte'
        )
          report(path, 'Condition operator does not match the answer type.');
        const availableValues = new Set(answerStep.input.options.map((option) => option.value));
        if (values.some((value) => typeof value !== 'string' || !availableValues.has(value)))
          report(path, 'Condition refers to an unavailable option.');
      }
    });
  for (const [variantIdentifier, variant] of Object.entries(configuration.experiment.variants)) {
    const earlierAnswers = new Set<string>();
    const sequenceIdentifiers = new Set(variant.stepSequence);
    let resultCount = 0;
    for (const [position, stepIdentifier] of variant.stepSequence.entries()) {
      const step = Object.hasOwn(configuration.steps, stepIdentifier)
        ? configuration.steps[stepIdentifier]
        : undefined;
      if (step === undefined) {
        report(
          `/experiment/variants/${variantIdentifier}/stepSequence`,
          `Unknown step: ${stepIdentifier}.`,
        );
        continue;
      }
      const override = Object.hasOwn(variant.stepOverrides, stepIdentifier)
        ? variant.stepOverrides[stepIdentifier]
        : undefined;
      if (override !== undefined)
        checkStepContent(
          { ...step, content: { ...step.content, ...override.content } },
          `/experiment/variants/${variantIdentifier}/stepOverrides/${stepIdentifier}/content`,
        );
      if (step.visibleWhen !== undefined)
        checkCondition(step.visibleWhen, `/steps/${stepIdentifier}/visibleWhen`, earlierAnswers);
      if (step.type === 'result') {
        resultCount += 1;
        if (position !== variant.stepSequence.length - 1)
          report(
            `/experiment/variants/${variantIdentifier}/stepSequence`,
            'Result must be the final step.',
          );
      } else if (step.type !== 'info') earlierAnswers.add(step.input.name);
    }
    if (resultCount !== 1)
      report(
        `/experiment/variants/${variantIdentifier}/stepSequence`,
        'Exactly one final result step is required.',
      );
    for (const stepIdentifier of Object.keys(variant.stepOverrides))
      if (!sequenceIdentifiers.has(stepIdentifier))
        report(
          `/experiment/variants/${variantIdentifier}/stepOverrides/${stepIdentifier}`,
          'Override must target a step in this variant.',
        );
    for (const resultIdentifier of Object.keys(variant.resultOverrides))
      if (!Object.hasOwn(configuration.results, resultIdentifier))
        report(
          `/experiment/variants/${variantIdentifier}/resultOverrides/${resultIdentifier}`,
          'Override refers to an unknown result.',
        );
  }
  if (
    configuration.experiment.variants.A.weight + configuration.experiment.variants.B.weight !==
    100
  )
    report('/experiment/variants', 'Variant weights must total 100.');
  for (const [resultIdentifier, result] of Object.entries(configuration.results))
    if (result.id !== resultIdentifier)
      report(`/results/${resultIdentifier}/id`, 'Result identifier must match its dictionary key.');
  if (!Object.hasOwn(configuration.results, configuration.defaultResultId))
    report('/defaultResultId', 'Unknown default result.');
  configuration.resultRules.forEach((rule, position) => {
    if (!Object.hasOwn(configuration.results, rule.resultId))
      report(`/resultRules/${position}/resultId`, 'Unknown result.');
    checkCondition(rule.when, `/resultRules/${position}/when`);
  });
  const eventNames = new Set(configuration.events.allowed.map((event) => event.name));
  if (eventNames.size !== configuration.events.allowed.length)
    report('/events/allowed', 'Event names must be unique.');
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
  for (const property of configuration.events.baseProperties)
    if (!supportedBaseProperties.has(property))
      report('/events/baseProperties', `Unsupported base event property: ${property}.`);
  for (const event of configuration.events.allowed)
    for (const property of event.properties)
      if (!supportedProperties.has(property))
        report('/events/allowed', `Unsupported event property: ${property}.`);
  for (const name of [
    'session_started',
    'step_viewed',
    'answer_submitted',
    'step_completed',
    'back_clicked',
    'result_viewed',
    'cta_clicked',
  ])
    if (!eventNames.has(name)) report('/events/allowed', `Required event missing: ${name}.`);
  return issues.length === 0
    ? { valid: true, configuration, issues: [] }
    : { valid: false, issues };
}
