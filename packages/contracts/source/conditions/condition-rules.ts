import { isMatching, match, P } from 'ts-pattern';

import { ConditionOperator, StepType } from '../shared/domain-values.js';
import type { AnswerCondition } from './condition-types.js';
import type { SelectionStep } from '../steps/step-types.js';

const numericOperands = isMatching({
  operator: P.union(
    ConditionOperator.Equal,
    ConditionOperator.In,
    ConditionOperator.GreaterThanOrEqual,
  ),
  value: P.union(P.number, P.array(P.number)),
});

const selectionOperators: ReadonlyDictionary<
  SelectionStep['type'],
  ReadonlyList<ConditionOperator>
> = {
  [StepType.SingleSelect]: [ConditionOperator.Equal, ConditionOperator.In],
  [StepType.MultiSelect]: [ConditionOperator.Contains],
};

export const ConditionRules = {
  values(condition: AnswerCondition): ReadonlyList<string | number> {
    return match(condition)
      .with({ operator: ConditionOperator.In }, ({ value }) => value)
      .otherwise(({ value }) => [value]);
  },

  acceptsNumericOperands: numericOperands,
  acceptsSelectionOperator: (step: SelectionStep, condition: AnswerCondition): boolean =>
    selectionOperators[step.type].includes(condition.operator),
} as const;
