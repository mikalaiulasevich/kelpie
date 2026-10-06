import {
  StepType,
  type AnswerValidation,
  type FunnelStep,
  type NumberStep,
  type SingleSelectionStep,
  type MultipleSelectionStep,
} from '@kelpie/contracts';
import { AnswerIssueCode, type AnswerIssue, type AnswerValidationResult } from './runtime_types.js';

// Decimal inputs can accumulate rounding error when divided into increments.
const NumericIncrementTolerance = 1e-8;

function createIssue(
  validation: AnswerValidation,
  code: AnswerIssueCode,
  fallbackMessage: string,
): AnswerIssue {
  const customMessage = Object.hasOwn(validation.messages, code)
    ? validation.messages[code]
    : undefined;

  return { code, message: customMessage ?? fallbackMessage };
}

function validateNumberAnswer(step: NumberStep, answer: unknown): readonly AnswerIssue[] {
  const { input, validation } = step;

  if (typeof answer !== 'number' || !Number.isFinite(answer)) {
    return [createIssue(validation, AnswerIssueCode.Type, 'Enter a finite number.')];
  }

  const issues: AnswerIssue[] = [];

  if (answer < input.min) {
    issues.push(createIssue(validation, AnswerIssueCode.Minimum, `Enter at least ${input.min}.`));
  }

  if (answer > input.max) {
    issues.push(
      createIssue(validation, AnswerIssueCode.Maximum, `Enter no more than ${input.max}.`),
    );
  }

  const increments = (answer - input.min) / input.step;
  const incrementDistance = Math.abs(increments - Math.round(increments));

  if (!Number.isFinite(increments) || incrementDistance > NumericIncrementTolerance) {
    issues.push(
      createIssue(validation, AnswerIssueCode.Increment, `Use increments of ${input.step}.`),
    );
  }

  return issues;
}

function validateSingleSelection(
  step: SingleSelectionStep,
  answer: unknown,
): readonly AnswerIssue[] {
  const isAvailableOption =
    typeof answer === 'string' && step.input.options.some((option) => option.value === answer);

  if (!isAvailableOption) {
    return [createIssue(step.validation, AnswerIssueCode.Option, 'Select an available option.')];
  }

  return [];
}

function isBoundedSelection(answer: unknown, maximumLength: number): answer is readonly string[] {
  return (
    Array.isArray(answer) &&
    answer.length <= maximumLength &&
    answer.every((value: unknown) => typeof value === 'string')
  );
}

function validateMultipleSelections(
  step: MultipleSelectionStep,
  answer: unknown,
): readonly AnswerIssue[] {
  const { input, validation } = step;

  // Bound work before inspecting values or constructing membership sets.
  if (!isBoundedSelection(answer, input.options.length)) {
    return [createIssue(validation, AnswerIssueCode.Type, 'Select available options.')];
  }

  const issues: AnswerIssue[] = [];
  const selectedValues = new Set(answer);
  const optionValues = new Set(input.options.map((option) => option.value));

  if (selectedValues.size !== answer.length) {
    issues.push(createIssue(validation, AnswerIssueCode.Duplicate, 'Selections must be unique.'));
  }

  if (answer.some((value) => !optionValues.has(value))) {
    issues.push(createIssue(validation, AnswerIssueCode.Option, 'Select an available option.'));
  }

  const minimumSelections = validation.minSelections ?? (validation.required ? 1 : 0);
  const maximumSelections = validation.maxSelections ?? input.options.length;

  if (answer.length < minimumSelections) {
    issues.push(
      createIssue(
        validation,
        AnswerIssueCode.MinimumSelections,
        `Choose at least ${minimumSelections} options.`,
      ),
    );
  }

  if (answer.length > maximumSelections) {
    issues.push(createIssue(validation, AnswerIssueCode.MaximumSelections, 'Too many selections.'));
  }

  return issues;
}

function validationResult(issues: readonly AnswerIssue[]): AnswerValidationResult {
  return { valid: issues.length === 0, issues };
}

export function validateStepAnswer(step: FunnelStep, answer: unknown): AnswerValidationResult {
  if (step.type === StepType.Information || step.type === StepType.Result) {
    return validationResult([
      {
        code: AnswerIssueCode.NotInteractive,
        message: 'This step does not accept answers.',
      },
    ]);
  }

  if (answer === undefined || answer === null || answer === '') {
    if (step.validation.required) {
      return validationResult([
        createIssue(step.validation, AnswerIssueCode.Required, 'An answer is required.'),
      ]);
    }

    return validationResult([]);
  }

  switch (step.type) {
    case StepType.Number:
      return validationResult(validateNumberAnswer(step, answer));
    case StepType.SingleSelect:
      return validationResult(validateSingleSelection(step, answer));
    case StepType.MultiSelect:
      return validationResult(validateMultipleSelections(step, answer));
  }
}
