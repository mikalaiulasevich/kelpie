import type { Static } from 'typebox';

import type { ConditionOperator } from '../shared/domain-values.js';
import type { SelectionStep } from '../steps/step-types.js';

import type {
  containsConditionSchema,
  equalConditionSchema,
  includedConditionSchema,
  minimumConditionSchema,
} from './condition-schema.js';

// Explicit recursive edges prevent TypeBox's recursive inference depth from widening to any.
export interface AllConditions {
  readonly all: readonly Condition[];
}

export interface AnyCondition {
  readonly any: readonly Condition[];
}

export type EqualCondition = DeepReadonly<Static<typeof equalConditionSchema>>;
export type IncludedCondition = DeepReadonly<Static<typeof includedConditionSchema>>;
export type ContainsCondition = DeepReadonly<Static<typeof containsConditionSchema>>;
export type MinimumCondition = DeepReadonly<Static<typeof minimumConditionSchema>>;
export type AnswerCondition =
  EqualCondition | IncludedCondition | ContainsCondition | MinimumCondition;
export type Condition = AllConditions | AnyCondition | AnswerCondition;

export type SelectionConditionOperators = ReadonlyDictionary<
  SelectionStep['type'],
  ReadonlyList<ConditionOperator>
>;
