import type { ConditionOperator } from './domain-values.js';

export interface AllConditions {
  readonly all: readonly Condition[];
}

export interface AnyCondition {
  readonly any: readonly Condition[];
}

export interface EqualCondition {
  readonly answer: string;
  readonly operator: typeof ConditionOperator.Equal;
  readonly value: string | number;
}

export interface IncludedCondition {
  readonly answer: string;
  readonly operator: typeof ConditionOperator.In;
  readonly value: readonly (string | number)[];
}

export interface ContainsCondition {
  readonly answer: string;
  readonly operator: typeof ConditionOperator.Contains;
  readonly value: string;
}

export interface MinimumCondition {
  readonly answer: string;
  readonly operator: typeof ConditionOperator.GreaterThanOrEqual;
  readonly value: number;
}

export type AnswerCondition =
  EqualCondition | IncludedCondition | ContainsCondition | MinimumCondition;

export type Condition = AllConditions | AnyCondition | AnswerCondition;
