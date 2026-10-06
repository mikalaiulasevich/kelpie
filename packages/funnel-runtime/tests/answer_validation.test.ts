import { describe, expect, it } from 'vitest';
import {
  ConditionOperator,
  StepType,
  type NumberStep,
  type SelectionStep,
} from '@kelpie/contracts';
import { AnswerIssueCode, evaluateCondition, validateStepAnswer } from '../source/index.js';

const numberStep: NumberStep = {
  id: 'hours',
  type: StepType.Number,
  content: { title: 'Hours' },
  input: { name: 'hours', min: 0, max: 1, step: 0.1 },
  validation: { required: true, messages: {} },
};

const selectionStep: SelectionStep = {
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

describe('answer validation boundaries', () => {
  it.each([undefined, null, ''])(
    'distinguishes missing required and optional answers: %s',
    (answer) => {
      expect(validateStepAnswer(numberStep, answer).issues.map((issue) => issue.code)).toEqual([
        AnswerIssueCode.Required,
      ]);
      expect(
        validateStepAnswer(
          {
            ...numberStep,
            validation: { ...numberStep.validation, required: false },
          },
          answer,
        ),
      ).toEqual({ valid: true, issues: [] });
    },
  );

  it('accepts floating point rounding noise but rejects values between increments', () => {
    expect(validateStepAnswer(numberStep, 0.1 + 0.2).valid).toBe(true);
    expect(validateStepAnswer(numberStep, 0.35).issues.map((issue) => issue.code)).toEqual([
      AnswerIssueCode.Increment,
    ]);
  });

  it('uses only own custom messages and preserves explicit empty messages', () => {
    const inheritedMessages: Record<string, string> = {};
    Object.setPrototypeOf(inheritedMessages, { required: 'Inherited message' });

    const inheritedResult = validateStepAnswer(
      {
        ...numberStep,
        validation: { required: true, messages: inheritedMessages },
      },
      undefined,
    );

    expect(inheritedResult.issues[0]?.message).toBe('An answer is required.');
    expect(
      validateStepAnswer(
        {
          ...numberStep,
          validation: { required: true, messages: { required: '' } },
        },
        undefined,
      ).issues[0]?.message,
    ).toBe('');
  });

  it('distinguishes malformed selections, duplicates, unknown values and selection limits', () => {
    const cases: readonly [unknown, readonly AnswerIssueCode[]][] = [
      [['focus', 1], [AnswerIssueCode.Type]],
      [['focus', 'focus'], [AnswerIssueCode.Duplicate]],
      [['unknown'], [AnswerIssueCode.Option]],
      [[], [AnswerIssueCode.MinimumSelections]],
      [['focus', 'speed', 'cost'], [AnswerIssueCode.MaximumSelections]],
      [['focus', 'speed', 'cost', 'unknown'], [AnswerIssueCode.Type]],
    ];

    for (const [answer, expectedCodes] of cases) {
      expect(validateStepAnswer(selectionStep, answer).issues.map((issue) => issue.code)).toEqual(
        expectedCodes,
      );
    }
  });

  it('never reads inherited answers when evaluating a condition', () => {
    const answers = {};
    Object.setPrototypeOf(answers, { work_mode: 'remote' });

    expect(
      evaluateCondition(
        { answer: 'work_mode', operator: ConditionOperator.Equal, value: 'remote' },
        answers,
      ),
    ).toBe(false);
  });
});
