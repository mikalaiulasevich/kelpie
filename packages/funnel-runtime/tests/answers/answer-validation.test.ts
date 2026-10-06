import { describe, expect, it } from 'vitest';
import { AnswerCases } from '../cases/answer-cases.js';
import { AnswerIssueCode, AnswerValidation } from '../../source/index.js';
import { AnswerFixtures } from '../fixtures/answer-fixtures.js';

describe('answer validation boundaries', () => {
  it.each(AnswerCases.missing)(
    'distinguishes missing required and optional answers: $description',
    ({ answer }) => {
      expect(
        AnswerValidation.validate(AnswerFixtures.number(), answer).issues.map(
          (issue) => issue.code,
        ),
      ).toEqual([AnswerIssueCode.Required]);
      expect(
        AnswerValidation.validate(
          {
            ...AnswerFixtures.number(),
            validation: { ...AnswerFixtures.number().validation, required: false },
          },
          answer,
        ),
      ).toEqual({ valid: true, issues: [] });
    },
  );

  it('accepts floating point rounding noise but rejects values between increments', () => {
    expect(AnswerValidation.validate(AnswerFixtures.number(), 0.1 + 0.2).valid).toBe(true);
    expect(
      AnswerValidation.validate(AnswerFixtures.number(), 0.35).issues.map((issue) => issue.code),
    ).toEqual([AnswerIssueCode.Increment]);
  });

  it('uses only own custom messages and preserves explicit empty messages', () => {
    const inheritedMessages: Record<string, string> = {};
    Object.setPrototypeOf(inheritedMessages, { required: 'Inherited message' });

    const inheritedResult = AnswerValidation.validate(
      {
        ...AnswerFixtures.number(),
        validation: { required: true, messages: inheritedMessages },
      },
      undefined,
    );

    expect(inheritedResult.issues[0]?.message).toBe('An answer is required.');
    expect(
      AnswerValidation.validate(
        {
          ...AnswerFixtures.number(),
          validation: { required: true, messages: { required: '' } },
        },
        undefined,
      ).issues[0]?.message,
    ).toBe('');
  });

  it.each(AnswerCases.selections)('$description', ({ answer, expectedCodes }) => {
    const result = AnswerValidation.validate(AnswerFixtures.selections(), answer);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expectedCodes);
  });

  it('rejects sparse selections instead of counting unselected array slots', () => {
    const answer = new Array<string>(1);

    expect(AnswerValidation.validate(AnswerFixtures.selections(), answer)).toEqual({
      valid: false,
      issues: [{ code: AnswerIssueCode.Type, message: 'Select available options.' }],
    });
  });
});
