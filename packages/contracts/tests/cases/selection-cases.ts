import type { AnswerValidation, SelectionLimits } from '../../source/index.js';

interface SelectionLimitCase {
  readonly name: string;
  readonly validation: AnswerValidation;
  readonly expected: SelectionLimits;
}

export const SelectionCases = {
  limits: [
    {
      name: 'required defaults',
      validation: { required: true, messages: {} },
      expected: { minimum: 1, maximum: 2 },
    },
    {
      name: 'optional defaults',
      validation: { required: false, messages: {} },
      expected: { minimum: 0, maximum: 2 },
    },
    {
      name: 'explicit zero minimum',
      validation: { required: true, minSelections: 0, maxSelections: 1, messages: {} },
      expected: { minimum: 0, maximum: 1 },
    },
  ] satisfies ReadonlyList<SelectionLimitCase>,
} as const;
