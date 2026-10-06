import { StepRules, type MultipleSelectionStep, type SingleSelectionStep } from '@kelpie/contracts';
import { AnswerIssueCollection, AnswerIssues } from './answer-issues.js';
import { AnswerMessages } from './answer-messages.js';
import { AnswerIssueCode, type AnswerIssue } from './answer-types.js';
import { AnswerValues } from './answer-values.js';

const SelectionIssues = {
  membership(
    step: MultipleSelectionStep,
    answer: ReadonlyList<string>,
    issues: AnswerIssueCollection,
  ): void {
    const selectedValues = new Set(answer);
    const optionValues = new Set(step.input.options.map((option) => option.value));

    issues
      .addWhen(
        selectedValues.size !== answer.length,
        AnswerIssueCode.Duplicate,
        AnswerMessages.UniqueSelectionsRequired,
      )
      .addWhen(
        answer.some((value) => !optionValues.has(value)),
        AnswerIssueCode.Option,
        AnswerMessages.AvailableOptionRequired,
      );
  },

  cardinality(step: MultipleSelectionStep, count: number, issues: AnswerIssueCollection): void {
    const { minimum, maximum } = StepRules.selectionLimits(step);

    issues
      .addWhen(
        count < minimum,
        AnswerIssueCode.MinimumSelections,
        AnswerMessages.MinimumSelections(minimum),
      )
      .addWhen(
        count > maximum,
        AnswerIssueCode.MaximumSelections,
        AnswerMessages.TooManySelections,
      );
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

    const issues = new AnswerIssueCollection(step.validation);
    SelectionIssues.membership(step, answer, issues);
    SelectionIssues.cardinality(step, answer.length, issues);

    return issues.toIssues();
  },
} as const;
