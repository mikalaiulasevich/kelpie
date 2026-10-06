import { match, P } from 'ts-pattern';

import type { InteractiveStep, SelectionStep } from './step-types.js';
import { ConfigurationMessages } from './configuration-messages.js';
import type { ConfigurationValidationContext } from './configuration-validation-context.js';
import { ConditionRules } from './condition-rules.js';
import { StepType } from './domain-values.js';
import type { AnswerCondition, Condition } from './condition-types.js';

export const ConditionValidation = {
  visitPredicates(condition: Condition, visit: (predicate: AnswerCondition) => void): void {
    match(condition)
      .with({ all: P._ }, ({ all }) =>
        all.forEach((child) => ConditionValidation.visitPredicates(child, visit)),
      )
      .with({ any: P._ }, ({ any }) =>
        any.forEach((child) => ConditionValidation.visitPredicates(child, visit)),
      )
      .with({ answer: P.string }, visit)
      .exhaustive();
  },
  selectionOperands(
    context: ConfigurationValidationContext,
    step: SelectionStep,
    predicate: AnswerCondition,
    path: string,
  ): void {
    if (!ConditionRules.acceptsSelectionOperator(step, predicate)) {
      context.report(path, ConfigurationMessages.ConditionOperatorMismatch);
    }

    const availableValues = new Set<string | number>(
      step.input.options.map((option) => option.value),
    );

    if (ConditionRules.values(predicate).some((value) => !availableValues.has(value))) {
      context.report(path, ConfigurationMessages.UnavailableConditionOption);
    }
  },

  operands(
    context: ConfigurationValidationContext,
    step: InteractiveStep,
    predicate: AnswerCondition,
    path: string,
  ): void {
    if (step.type !== StepType.Number) {
      ConditionValidation.selectionOperands(context, step, predicate, path);

      return;
    }

    if (!ConditionRules.acceptsNumericOperands(predicate)) {
      context.report(path, ConfigurationMessages.NumericConditionOperandsRequired);
    }
  },

  validate(
    context: ConfigurationValidationContext,
    condition: Condition,
    path: string,
    earlierAnswers?: ReadonlySet<string>,
  ): void {
    ConditionValidation.visitPredicates(condition, (predicate) => {
      const answerStep = context.answerSteps.get(predicate.answer);

      if (answerStep === undefined) {
        context.report(path, ConfigurationMessages.UnknownAnswer(predicate.answer));

        return;
      }

      if (earlierAnswers !== undefined && !earlierAnswers.has(predicate.answer)) {
        context.report(path, ConfigurationMessages.AnswerOrder(predicate.answer));
      }

      ConditionValidation.operands(context, answerStep, predicate, path);
    });
  },
} as const;
