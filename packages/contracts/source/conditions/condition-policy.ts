import { ConditionOperator, StepType } from '../shared/domain-values.js';
import type { SelectionConditionOperators } from './condition-types.js';

const selectionOperators: SelectionConditionOperators = {
  [StepType.SingleSelect]: [ConditionOperator.Equal, ConditionOperator.In],
  [StepType.MultiSelect]: [ConditionOperator.Contains],
};

export const ConditionPolicy = {
  SelectionOperators: selectionOperators,
} as const;
