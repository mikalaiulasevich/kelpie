import { StepType, type AnswerValidation, type SelectionStep } from '../../source/index.js';

export const SelectionFixtures = {
  selectionStep(validation: AnswerValidation): SelectionStep {
    return {
      id: 'preferences',
      type: StepType.MultiSelect,
      content: { title: 'Preferences' },
      input: {
        name: 'preferences',
        options: [
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second' },
        ],
      },
      validation,
    };
  },
} as const;
