import { isMatching, match, P } from 'ts-pattern';

import { ConditionOperator } from '../shared/domain-values.js';
import { ConditionPolicy } from './condition-policy.js';
import type { AnswerCondition } from './condition-types.js';
import type { SelectionStep } from '../steps/step-types.js';

export const ConditionRules = {
  values(condition: AnswerCondition): ReadonlyList<TextOrNumber> {
    return match(condition)
      .with({ operator: ConditionOperator.In }, ({ value }) => value)
      .otherwise(({ value }) => [value]);
  },

  acceptsNumericOperands: isMatching({
    operator: P.union(
      ConditionOperator.Equal,
      ConditionOperator.In,
      ConditionOperator.GreaterThanOrEqual,
    ),
    value: P.union(P.number, P.array(P.number)),
  }),
  acceptsSelectionOperator: (step: SelectionStep, condition: AnswerCondition): boolean =>
    ConditionPolicy.SelectionOperators[step.type].includes(condition.operator),
} as const;
