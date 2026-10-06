import {
  ConditionOperator,
  StepType,
  type AnswerValidation,
  type SelectionStep,
} from '../../source/index.js';
import { ConfigurationFixtures } from './configuration-fixtures.js';

export const SelectionFixtures = {
  repeatedOptionReferences() {
    const original = ConfigurationFixtures.valid();
    const options = [
      { value: 'remote', label: 'Remote' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'office', label: 'Office' },
    ];
    const workMode = {
      id: 'work_mode',
      type: StepType.SingleSelect,
      content: { title: 'Work mode' },
      input: { name: 'work_mode', options },
      validation: { required: true, messages: {} },
    };
    const configuration = {
      ...original,
      steps: { ...original.steps, work_mode: workMode },
      resultRules: [
        {
          resultId: 'balanced',
          when: { answer: 'work_mode', operator: ConditionOperator.Equal, value: 'teleportation' },
        },
        {
          resultId: 'office_core',
          when: { answer: 'work_mode', operator: ConditionOperator.Equal, value: 'teleportation' },
        },
      ],
    };

    return { configuration, options };
  },

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
