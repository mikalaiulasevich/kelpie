import type { AnswerValidation, FunnelStep, SelectionLimits } from '../../source/index.js';

import { SelectionFixtures } from '../fixtures/selection-fixtures.js';

interface SelectionLimitCase {
  readonly name: string;
  readonly validation: AnswerValidation;
  readonly expected: SelectionLimits;
}

interface InteractiveStepCase {
  readonly name: string;
  readonly step: FunnelStep;
  readonly interactive: boolean;
}

export const SelectionCases = {
  interactivity: [
    {
      name: 'multiple selection',
      step: SelectionFixtures.selectionStep({ required: true, messages: {} }),
      interactive: true,
    },
    {
      name: 'single selection',
      step: {
        ...SelectionFixtures.selectionStep({ required: true, messages: {} }),
        type: 'single-select',
      },
      interactive: true,
    },
    {
      name: 'number',
      step: {
        id: 'age',
        type: 'number',
        content: { title: 'Age' },
        input: { name: 'age', min: 0, max: 100, step: 1 },
        validation: { required: true, messages: {} },
      },
      interactive: true,
    },
    {
      name: 'information',
      step: {
        id: 'intro',
        type: 'info',
        content: { title: 'Welcome', body: 'Introduction', primaryActionLabel: 'Continue' },
      },
      interactive: false,
    },
    {
      name: 'result',
      step: { id: 'result', type: 'result', content: {}, resultSource: 'resultRules' },
      interactive: false,
    },
  ] satisfies ReadonlyList<InteractiveStepCase>,
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
