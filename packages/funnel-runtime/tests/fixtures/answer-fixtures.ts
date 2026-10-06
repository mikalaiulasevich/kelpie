import {
  StepType,
  type NumberStep,
  type MultipleSelectionStep,
  type AnswerValidation,
} from '@kelpie/contracts';

export const AnswerFixtures = {
  number(validation: Partial<AnswerValidation> = {}): NumberStep {
    return {
      id: 'hours',
      type: StepType.Number,
      content: { title: 'Hours' },
      input: { name: 'hours', min: 0, max: 1, step: 0.1 },
      validation: { required: true, messages: {}, ...validation },
    };
  },

  selections(): MultipleSelectionStep {
    return {
      id: 'priorities',
      type: StepType.MultiSelect,
      content: { title: 'Priorities' },
      input: {
        name: 'priorities',
        options: [
          { value: 'focus', label: 'Focus' },
          { value: 'speed', label: 'Speed' },
          { value: 'cost', label: 'Cost' },
        ],
      },
      validation: { required: true, minSelections: 1, maxSelections: 2, messages: {} },
    };
  },
} as const;
