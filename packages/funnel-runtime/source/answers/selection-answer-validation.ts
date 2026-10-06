import { StepRules, type MultipleSelectionStep, type SingleSelectionStep } from '@kelpie/contracts';
import { AnswerIssues } from './answer-issues.js';
import { AnswerMessages } from './answer-messages.js';
import { AnswerIssueCode, type AnswerIssue } from './answer-types.js';
import { AnswerValues } from './answer-values.js';

const SelectionIssues = {
  membership(step: MultipleSelectionStep, answer: ReadonlyList<string>): ReadonlyList<AnswerIssue> {
    const issues: AnswerIssue[] = [];
    const selectedValues = new Set(answer);
    const optionValues = new Set(step.input.options.map((option) => option.value));

    if (selectedValues.size !== answer.length) {
      issues.push(
        AnswerIssues.create(
          step.validation,
          AnswerIssueCode.Duplicate,
          AnswerMessages.UniqueSelectionsRequired,
        ),
      );
    }

    if (answer.some((value) => !optionValues.has(value))) {
      issues.push(
        AnswerIssues.create(
          step.validation,
          AnswerIssueCode.Option,
          AnswerMessages.AvailableOptionRequired,
        ),
      );
    }

    return issues;
  },

  cardinality(step: MultipleSelectionStep, count: number): ReadonlyList<AnswerIssue> {
    const issues: AnswerIssue[] = [];
    const { minimum, maximum } = StepRules.selectionLimits(step);

    if (count < minimum) {
      issues.push(
        AnswerIssues.create(
          step.validation,
          AnswerIssueCode.MinimumSelections,
          AnswerMessages.MinimumSelections(minimum),
        ),
      );
    }

    if (count > maximum) {
      issues.push(
        AnswerIssues.create(
          step.validation,
          AnswerIssueCode.MaximumSelections,
          AnswerMessages.TooManySelections,
        ),
      );
    }

    return issues;
  },
} as const;

export const SelectionAnswerValidation = {
  single(step: SingleSelectionStep, answer: unknown): ReadonlyList<AnswerIssue> {
    const isAvailableOption =
      typeof answer === 'string' && step.input.options.some((option) => option.value === answer);

    if (!isAvailableOption) {
      return [
        AnswerIssues.create(
          step.validation,
          AnswerIssueCode.Option,
          AnswerMessages.AvailableOptionRequired,
        ),
      ];
    }

    return [];
  },

  multiple(step: MultipleSelectionStep, answer: unknown): ReadonlyList<AnswerIssue> {
    // Bound work before inspecting values or constructing membership sets.
    if (!AnswerValues.isBoundedSelection(answer, step.input.options.length)) {
      return [
        AnswerIssues.create(
          step.validation,
          AnswerIssueCode.Type,
          AnswerMessages.AvailableOptionsRequired,
        ),
      ];
    }

    return [
      ...SelectionIssues.membership(step, answer),
      ...SelectionIssues.cardinality(step, answer.length),
    ];
  },
} as const;
