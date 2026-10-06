import { ConditionOperator, type Condition, type SessionAnswers } from '@kelpie/contracts';

interface ConditionExample {
  readonly description: string;
  readonly condition: Condition;
  readonly answers: SessionAnswers;
  readonly expected: boolean;
}

export const ConditionCases: readonly ConditionExample[] = [
  {
    description: 'does not match a missing answer',
    condition: { answer: 'missing', operator: ConditionOperator.Equal, value: 'remote' },
    answers: {},
    expected: false,
  },
  {
    description: 'compares scalar values without coercion',
    condition: { answer: 'size', operator: ConditionOperator.Equal, value: 10 },
    answers: { size: '10' },
    expected: false,
  },
  {
    description: 'finds a scalar in the allowed set',
    condition: { answer: 'mode', operator: ConditionOperator.In, value: ['remote', 'hybrid'] },
    answers: { mode: 'remote' },
    expected: true,
  },
  {
    description: 'does not treat an array as a scalar set member',
    condition: { answer: 'mode', operator: ConditionOperator.In, value: ['remote'] },
    answers: { mode: ['remote'] },
    expected: false,
  },
  {
    description: 'finds a selected value',
    condition: { answer: 'priorities', operator: ConditionOperator.Contains, value: 'focus' },
    answers: { priorities: ['focus', 'speed'] },
    expected: true,
  },
  {
    description: 'does not interpret string containment as a selection',
    condition: { answer: 'priorities', operator: ConditionOperator.Contains, value: 'focus' },
    answers: { priorities: 'focus' },
    expected: false,
  },
  {
    description: 'includes the numeric lower bound',
    condition: { answer: 'size', operator: ConditionOperator.GreaterThanOrEqual, value: 10 },
    answers: { size: 10 },
    expected: true,
  },
  {
    description: 'rejects nonfinite numeric answers',
    condition: { answer: 'size', operator: ConditionOperator.GreaterThanOrEqual, value: 10 },
    answers: { size: Infinity },
    expected: false,
  },
  {
    description: 'evaluates nested alternatives and conjunctions',
    condition: {
      all: [
        { answer: 'size', operator: ConditionOperator.GreaterThanOrEqual, value: 10 },
        {
          any: [
            { answer: 'mode', operator: ConditionOperator.Equal, value: 'remote' },
            { answer: 'mode', operator: ConditionOperator.Equal, value: 'hybrid' },
          ],
        },
      ],
    },
    answers: { size: 10, mode: 'hybrid' },
    expected: true,
  },
];
