import { StepType } from './domain-values.js';
import type { FunnelStep, InteractiveStep, SelectionStep } from './step-types.js';

export interface SelectionLimits {
  readonly minimum: number;
  readonly maximum: number;
}

export function isInteractiveStep(step: FunnelStep): step is InteractiveStep {
  return (
    step.type === StepType.Number ||
    step.type === StepType.SingleSelect ||
    step.type === StepType.MultiSelect
  );
}

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
