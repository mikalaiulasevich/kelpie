import { isMatching, P } from 'ts-pattern';
import { StepType } from './domain-values.js';
import type { SelectionStep } from './step-types.js';

export interface SelectionLimits {
  readonly minimum: number;
  readonly maximum: number;
}

export const isInteractiveStep = isMatching({
  type: P.union(StepType.Number, StepType.SingleSelect, StepType.MultiSelect),
});

/** Semantic validation supplies a distinct choice count when options contain duplicates. */
export function resolveSelectionLimits(
  step: SelectionStep,
  availableOptionCount = step.input.options.length,
): SelectionLimits {
  return {
    minimum: step.validation.minSelections ?? (step.validation.required ? 1 : 0),
    maximum: step.validation.maxSelections ?? availableOptionCount,
  };
}

export const StepRules = Object.freeze({
  isInteractive: isInteractiveStep,
  selectionLimits: resolveSelectionLimits,
  hasSelectionLimits: isMatching(P.union({ minSelections: P.number }, { maxSelections: P.number })),
});
