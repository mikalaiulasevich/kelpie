import { describe, expect, it } from 'vitest';
import { AnswerCases } from '../cases/answer-cases.js';
import { AnswerValidation } from '../../source/index.js';
import { AnswerFixtures } from '../fixtures/answer-fixtures.js';

describe('answer validation boundaries', () => {
  it.each(AnswerCases.missing)(
    'distinguishes missing required and optional answers: $description',
    ({ answer }) => {
      const requiredStep = AnswerFixtures.number();
      const optionalStep = AnswerFixtures.number({ required: false });

      const requiredResult = AnswerValidation.validate(requiredStep, answer);
      const optionalResult = AnswerValidation.validate(optionalStep, answer);

      expect(requiredResult.issues.map((issue) => issue.code)).toEqual(['required']);
      expect(optionalResult).toEqual({ valid: true, issues: [] });
    },
  );

  it('accepts floating point rounding noise but rejects values between increments', () => {
    const step = AnswerFixtures.number();

    const roundedResult = AnswerValidation.validate(step, 0.1 + 0.2);
    const misalignedResult = AnswerValidation.validate(step, 0.35);

    expect(roundedResult.valid).toBe(true);
    expect(misalignedResult.issues.map((issue) => issue.code)).toEqual(['step']);
  });

  it('uses only own custom messages and preserves explicit empty messages', () => {
    const inheritedMessages: Dictionary<string, string> = {};
    Object.setPrototypeOf(inheritedMessages, { required: 'Inherited message' });
    const inheritedStep = AnswerFixtures.number({ messages: inheritedMessages });
    const emptyMessageStep = AnswerFixtures.number({ messages: { required: '' } });

    const inheritedResult = AnswerValidation.validate(inheritedStep, undefined);
    const emptyMessageResult = AnswerValidation.validate(emptyMessageStep, undefined);

    expect(inheritedResult.issues[0]?.message).toBe('An answer is required.');
    expect(emptyMessageResult.issues[0]?.message).toBe('');
  });

  it.each(AnswerCases.selections)('$description', ({ answer, expectedCodes }) => {
    const result = AnswerValidation.validate(AnswerFixtures.selections(), answer);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expectedCodes);
  });

  it('rejects sparse selections instead of counting unselected array slots', () => {
    const answer = new Array<string>(1);

    const result = AnswerValidation.validate(AnswerFixtures.selections(), answer);

    expect(result).toEqual({
      valid: false,
      issues: [{ code: 'type', message: 'Select available options.' }],
    });
  });
});
