import { isUndefined } from 'es-toolkit/predicate';
import { match, P } from 'ts-pattern';

import type { InteractiveStep, SelectionStep } from '../steps/step-types.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import { ConditionRules } from './condition-rules.js';
import { StepType } from '../shared/domain-values.js';
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

    const availableValues = context.selectionValues(step);

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

      if (isUndefined(answerStep)) {
        context.report(path, ConfigurationMessages.UnknownAnswer(predicate.answer));

        return;
      }

      if (!isUndefined(earlierAnswers) && !earlierAnswers.has(predicate.answer)) {
        context.report(path, ConfigurationMessages.AnswerOrder(predicate.answer));
      }

      ConditionValidation.operands(context, answerStep, predicate, path);
    });
  },
} as const;
