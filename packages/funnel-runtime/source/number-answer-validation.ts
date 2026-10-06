import type { NumberStep } from '@kelpie/contracts';
import { AnswerIssues } from './answer-issues.js';
import { AnswerMessages } from './answer-messages.js';
import { RuntimePolicy } from './runtime-policy.js';
import { AnswerIssueCode, type AnswerIssue } from './runtime-types.js';
import { AnswerValues } from './answer-values.js';

const NumericIncrements = {
  accepts(step: NumberStep, answer: number): boolean {
    const increments = (answer - step.input.min) / step.input.step;
    const roundingDistance = Math.abs(increments - Math.round(increments));

    return (
      Number.isFinite(increments) && roundingDistance <= RuntimePolicy.NumericIncrementTolerance
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

    const issues: AnswerIssue[] = [];

    if (answer < input.min) {
      issues.push(
        AnswerIssues.create(
          validation,
          AnswerIssueCode.Minimum,
          AnswerMessages.MinimumNumber(input.min),
        ),
      );
    }

    if (answer > input.max) {
      issues.push(
        AnswerIssues.create(
          validation,
          AnswerIssueCode.Maximum,
          AnswerMessages.MaximumNumber(input.max),
        ),
      );
    }

    if (!NumericIncrements.accepts(step, answer)) {
      issues.push(
        AnswerIssues.create(
          validation,
          AnswerIssueCode.Increment,
          AnswerMessages.NumericIncrement(input.step),
        ),
      );
    }

    return issues;
  },
} as const;
