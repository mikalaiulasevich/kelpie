import { StepType, StepRules, type FunnelStep } from '@kelpie/contracts';
import { match } from 'ts-pattern';
import { AnswerIssues } from './answer-issues.js';
import { AnswerMessages } from './answer-messages.js';
import { NumberAnswerValidation } from './number-answer-validation.js';
import { SelectionAnswerValidation } from './selection-answer-validation.js';
import { AnswerIssueCode, type AnswerValidationResult } from './answer-types.js';
import { AnswerValues } from './answer-values.js';

export const AnswerValidation = {
  validate(step: FunnelStep, answer: unknown): AnswerValidationResult {
    if (!StepRules.isInteractive(step)) {
      return AnswerIssues.result([
        {
          code: AnswerIssueCode.NotInteractive,
          message: AnswerMessages.NonInteractiveStep,
        },
      ]);
    }

    if (AnswerValues.isMissing(answer)) {
      if (step.validation.required) {
        return AnswerIssues.result([
          AnswerIssues.create(
            step.validation,
            AnswerIssueCode.Required,
            AnswerMessages.RequiredAnswer,
          ),
        ]);
      }

      return AnswerIssues.result([]);
    }

    const issues = match(step)
      .with({ type: StepType.Number }, (numberStep) =>
        NumberAnswerValidation.validate(numberStep, answer),
      )
      .with({ type: StepType.SingleSelect }, (selectionStep) =>
        SelectionAnswerValidation.single(selectionStep, answer),
      )
      .with({ type: StepType.MultiSelect }, (selectionStep) =>
        SelectionAnswerValidation.multiple(selectionStep, answer),
      )
      .exhaustive();

    return AnswerIssues.result(issues);
  },
} as const;
