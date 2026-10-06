import type { Static, TSchema } from 'typebox';

import type { Condition } from '../conditions/condition-types.js';
import type {
  answerValidationSchema,
  informationStepSchema,
  multipleSelectionStepSchema,
  numberInputSchema,
  numberStepSchema,
  resultStepSchema,
  selectionInputSchema,
  selectionOptionSchema,
  singleSelectionStepSchema,
  stepContentSchema,
} from './step-schema.js';

export type StepAnswer = string | number | readonly string[];
export type SessionAnswers = ReadonlyDictionary<string, StepAnswer>;
export type StepContent = DeepReadonly<Static<typeof stepContentSchema>>;
export type AnswerValidation = DeepReadonly<Static<typeof answerValidationSchema>>;
export type NumberInput = DeepReadonly<Static<typeof numberInputSchema>>;
export type SelectionOption = DeepReadonly<Static<typeof selectionOptionSchema>>;
export type SelectionInput = DeepReadonly<Static<typeof selectionInputSchema>>;

// The JSON Schema reference is resolved by Ajv; the recursive type has its own explicit owner.
type StepWithCondition<Schema extends TSchema> = DeepReadonly<
  Omit<Static<Schema>, 'visibleWhen'>
> & {
  readonly visibleWhen?: Condition;
};

export type InformationStep = StepWithCondition<typeof informationStepSchema>;
export type ResultStep = StepWithCondition<typeof resultStepSchema>;
export type NumberStep = StepWithCondition<typeof numberStepSchema>;
export type SingleSelectionStep = StepWithCondition<typeof singleSelectionStepSchema>;
export type MultipleSelectionStep = StepWithCondition<typeof multipleSelectionStepSchema>;
export type SelectionStep = SingleSelectionStep | MultipleSelectionStep;
export type InteractiveStep = NumberStep | SelectionStep;
export type FunnelStep = InformationStep | ResultStep | InteractiveStep;
