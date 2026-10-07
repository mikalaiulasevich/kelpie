import type { Static } from 'typebox';

import type { ConditionOperator } from '../shared/domain-values.js';
import type { SelectionStep } from '../steps/step-types.js';

import type { ConditionSchemas } from './condition-schema.js';

// Explicit recursive edges prevent TypeBox's recursive inference depth from widening to any.
export interface AllConditions {
  readonly all: readonly Condition[];
}

export interface AnyCondition {
  readonly any: readonly Condition[];
}

export type EqualCondition = DeepReadonly<Static<typeof ConditionSchemas.EqualCondition>>;

export type IncludedCondition = DeepReadonly<Static<typeof ConditionSchemas.IncludedCondition>>;

export type ContainsCondition = DeepReadonly<Static<typeof ConditionSchemas.ContainsCondition>>;

export type MinimumCondition = DeepReadonly<Static<typeof ConditionSchemas.MinimumCondition>>;

export type AnswerCondition =
  EqualCondition | IncludedCondition | ContainsCondition | MinimumCondition;

export type Condition = AllConditions | AnyCondition | AnswerCondition;

export type SelectionConditionOperators = ReadonlyDictionary<
  SelectionStep['type'],
  ReadonlyList<ConditionOperator>
>;
