import type { Condition } from './condition_types.js';
import type { StepType } from './domain_values.js';

export type StepAnswer = string | number | readonly string[];

export type SessionAnswers = Readonly<Record<string, StepAnswer>>;

export interface StepContent {
  readonly title?: string;
  readonly helperText?: string;
  readonly eyebrow?: string;
  readonly body?: string;
  readonly primaryActionLabel?: string;
  readonly loadingTitle?: string;
  readonly errorTitle?: string;
  readonly retryLabel?: string;
}

export interface AnswerValidation {
  readonly required: boolean;
  readonly minSelections?: number;
  readonly maxSelections?: number;
  readonly messages: Readonly<Record<string, string>>;
}

interface StepBase {
  readonly id: string;
  readonly content: StepContent;
  readonly visibleWhen?: Condition;
}

export interface InformationStep extends StepBase {
  readonly type: typeof StepType.Information;
}

export interface ResultStep extends StepBase {
  readonly type: typeof StepType.Result;
  readonly resultSource: 'resultRules';
}

export interface NumberInput {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit?: string;
}

export interface NumberStep extends StepBase {
  readonly type: typeof StepType.Number;
  readonly input: NumberInput;
  readonly validation: AnswerValidation;
}

export interface SelectionOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectionInput {
  readonly name: string;
  readonly options: readonly SelectionOption[];
}

interface SelectionStepBase extends StepBase {
  readonly input: SelectionInput;
  readonly validation: AnswerValidation;
}

export interface SingleSelectionStep extends SelectionStepBase {
  readonly type: typeof StepType.SingleSelect;
}

export interface MultipleSelectionStep extends SelectionStepBase {
  readonly type: typeof StepType.MultiSelect;
}

export type SelectionStep = SingleSelectionStep | MultipleSelectionStep;

export type InteractiveStep = NumberStep | SelectionStep;

export type FunnelStep = InformationStep | ResultStep | InteractiveStep;
