import { describe, expect, it } from 'vitest';
import { ConditionOperator, type Condition, type SessionAnswers } from '@kelpie/contracts';
import { ConditionCases } from '../cases/condition-cases.js';
import { ConditionEvaluation } from '../../source/conditions/condition-evaluation.js';

describe('condition evaluation', () => {
  it.each(ConditionCases)('$description', ({ condition, answers, expected }) => {
    expect(ConditionEvaluation.evaluate(condition, answers)).toBe(expected);
  });

  it('does not read inherited answers', () => {
    const answers: SessionAnswers = {};
    Object.setPrototypeOf(answers, { mode: 'remote' });

    expect(
      ConditionEvaluation.evaluate(
        { answer: 'mode', operator: ConditionOperator.Equal, value: 'remote' },
        answers,
      ),
    ).toBe(false);
  });

  it('short circuits conjunctions and alternatives', () => {
    const answers: SessionAnswers = {
      mode: 'remote',
      get untouched(): never {
        throw new Error('Short-circuited answers must not be inspected.');
      },
    };
    const matching: Condition = {
      answer: 'mode',
      operator: ConditionOperator.Equal,
      value: 'remote',
    };
    const missing: Condition = {
      answer: 'missing',
      operator: ConditionOperator.Equal,
      value: 'remote',
    };
    const untouched: Condition = {
      answer: 'untouched',
      operator: ConditionOperator.Equal,
      value: 'remote',
    };

    expect(ConditionEvaluation.evaluate({ any: [matching, untouched] }, answers)).toBe(true);
    expect(ConditionEvaluation.evaluate({ all: [missing, untouched] }, answers)).toBe(false);
  });
});
