import type { NumberStep } from '@kelpie/contracts';
import { AnswerIssueCollection, AnswerIssues } from './answer-issues.js';
import { AnswerMessages } from './answer-messages.js';
import { AnswerPolicy } from './answer-policy.js';
import { AnswerIssueCode, type AnswerIssue } from './answer-types.js';
import { AnswerValues } from './answer-values.js';

const NumericIncrements = {
  accepts(step: NumberStep, answer: number): boolean {
    const increments = (answer - step.input.min) / step.input.step;
    const roundingDistance = Math.abs(increments - Math.round(increments));

    return (
      Number.isFinite(increments) && roundingDistance <= AnswerPolicy.NumericIncrementTolerance
    );
  },
} as const;

export const NumberAnswerValidation = {
  validate(step: NumberStep, answer: unknown): ReadonlyList<AnswerIssue> {
    const { input, validation } = step;

    if (!AnswerValues.isFiniteNumber(answer)) {
      return [
        AnswerIssues.create(validation, AnswerIssueCode.Type, AnswerMessages.FiniteNumberRequired),
      ];
    }

    return new AnswerIssueCollection(validation)
      .addFormattedWhen(
        answer < input.min,
        AnswerIssueCode.Minimum,
        AnswerMessages.MinimumNumber,
        input.min,
      )
      .addFormattedWhen(
        answer > input.max,
        AnswerIssueCode.Maximum,
        AnswerMessages.MaximumNumber,
        input.max,
      )
      .addFormattedWhen(
        !NumericIncrements.accepts(step, answer),
        AnswerIssueCode.Increment,
        AnswerMessages.NumericIncrement,
        input.step,
      )
      .toIssues();
  },
} as const;
