import type { Static, TSchema } from 'typebox';

import type { Condition } from '../conditions/condition-types.js';
import type { StepSchemas } from './step-schema.js';

export type StepAnswer = TextOrNumber | ReadonlyList<string>;

export type SessionAnswers = ReadonlyDictionary<string, StepAnswer>;

export type StepContent = DeepReadonly<Static<typeof StepSchemas.StepContent>>;

export type AnswerValidation = DeepReadonly<Static<typeof StepSchemas.AnswerValidation>>;

export type NumberInput = DeepReadonly<Static<typeof StepSchemas.NumberInput>>;

export type SelectionOption = DeepReadonly<Static<typeof StepSchemas.SelectionOption>>;

export type SelectionInput = DeepReadonly<Static<typeof StepSchemas.SelectionInput>>;

// The JSON Schema reference is resolved by Ajv; the recursive type has its own explicit owner.
type StepWithCondition<Schema extends TSchema> = DeepReadonly<
  Omit<Static<Schema>, 'visibleWhen'>
> & {
  readonly visibleWhen?: Condition;
};

export type InformationStep = StepWithCondition<typeof StepSchemas.InformationStep>;

export type ResultStep = StepWithCondition<typeof StepSchemas.ResultStep>;

export type NumberStep = StepWithCondition<typeof StepSchemas.NumberStep>;

export type SingleSelectionStep = StepWithCondition<typeof StepSchemas.SingleSelectionStep>;

export type MultipleSelectionStep = StepWithCondition<typeof StepSchemas.MultipleSelectionStep>;

export type SelectionStep = SingleSelectionStep | MultipleSelectionStep;

export type InteractiveStep = NumberStep | SelectionStep;

export type FunnelStep = InformationStep | ResultStep | InteractiveStep;

export interface SelectionLimits {
  readonly minimum: number;
  readonly maximum: number;
}
