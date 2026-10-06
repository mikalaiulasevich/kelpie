import {
  StepType,
  isInteractiveStep,
  readOwnProperty,
  resolveSelectionLimits,
  type AnswerValidation,
  type FunnelStep,
  type NumberStep,
  type SingleSelectionStep,
  type MultipleSelectionStep,
} from '@kelpie/contracts';
import { match } from 'ts-pattern';

import { isFiniteNumber, isMissingAnswer } from './value-predicates.js';
import { AnswerMessages } from './answer-messages.js';
import { AnswerIssueCode, type AnswerIssue, type AnswerValidationResult } from './runtime-types.js';

import { RuntimePolicy } from './runtime-policy.js';

function createIssue(
  validation: AnswerValidation,
  code: AnswerIssueCode,
  fallbackMessage: string,
): AnswerIssue {
  const customMessage = readOwnProperty(validation.messages, code);

  return { code, message: customMessage ?? fallbackMessage };
}

function validateNumberAnswer(step: NumberStep, answer: unknown): readonly AnswerIssue[] {
  const { input, validation } = step;

  if (!isFiniteNumber(answer)) {
    return [createIssue(validation, AnswerIssueCode.Type, AnswerMessages.FiniteNumberRequired)];
  }

  const issues: AnswerIssue[] = [];

  if (answer < input.min) {
    issues.push(
      createIssue(validation, AnswerIssueCode.Minimum, AnswerMessages.MinimumNumber(input.min)),
    );
  }

  if (answer > input.max) {
    issues.push(
      createIssue(validation, AnswerIssueCode.Maximum, AnswerMessages.MaximumNumber(input.max)),
    );
  }

  const increments = (answer - input.min) / input.step;
  const incrementDistance = Math.abs(increments - Math.round(increments));

  if (!Number.isFinite(increments) || incrementDistance > RuntimePolicy.NumericIncrementTolerance) {
    issues.push(
      createIssue(
        validation,
        AnswerIssueCode.Increment,
        AnswerMessages.NumericIncrement(input.step),
      ),
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
    return [
      createIssue(step.validation, AnswerIssueCode.Option, AnswerMessages.AvailableOptionRequired),
    ];
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
    return [createIssue(validation, AnswerIssueCode.Type, AnswerMessages.AvailableOptionsRequired)];
  }

  const issues: AnswerIssue[] = [];
  const selectedValues = new Set(answer);
  const optionValues = new Set(input.options.map((option) => option.value));

  if (selectedValues.size !== answer.length) {
    issues.push(
      createIssue(validation, AnswerIssueCode.Duplicate, AnswerMessages.UniqueSelectionsRequired),
    );
  }

  if (answer.some((value) => !optionValues.has(value))) {
    issues.push(
      createIssue(validation, AnswerIssueCode.Option, AnswerMessages.AvailableOptionRequired),
    );
  }

  const { minimum, maximum } = resolveSelectionLimits(step);

  if (answer.length < minimum) {
    issues.push(
      createIssue(
        validation,
        AnswerIssueCode.MinimumSelections,
        AnswerMessages.MinimumSelections(minimum),
      ),
    );
  }

  if (answer.length > maximum) {
    issues.push(
      createIssue(validation, AnswerIssueCode.MaximumSelections, AnswerMessages.TooManySelections),
    );
  }

  return issues;
}

function validationResult(issues: readonly AnswerIssue[]): AnswerValidationResult {
  if (issues.length === 0) {
    return { valid: true, issues: [] };
  }

  return { valid: false, issues };
}

export function validateStepAnswer(step: FunnelStep, answer: unknown): AnswerValidationResult {
  if (!isInteractiveStep(step)) {
    return validationResult([
      {
        code: AnswerIssueCode.NotInteractive,
        message: AnswerMessages.NonInteractiveStep,
      },
    ]);
  }

  if (isMissingAnswer(answer)) {
    if (step.validation.required) {
      return validationResult([
        createIssue(step.validation, AnswerIssueCode.Required, AnswerMessages.RequiredAnswer),
      ]);
    }

    return validationResult([]);
  }

  const issues = match(step)
    .with({ type: StepType.Number }, (numberStep) => validateNumberAnswer(numberStep, answer))
    .with({ type: StepType.SingleSelect }, (selectionStep) =>
      validateSingleSelection(selectionStep, answer),
    )
    .with({ type: StepType.MultiSelect }, (selectionStep) =>
      validateMultipleSelections(selectionStep, answer),
    )
    .exhaustive();

  return validationResult(issues);
}
