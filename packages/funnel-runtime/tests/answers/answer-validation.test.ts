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

  it.each(AnswerCases.presentNonNumeric)(
    'validates present optional answers instead of treating them as missing: $description',
    ({ answer }) => {
      const step = AnswerFixtures.number({ required: false });

      const result = AnswerValidation.validate(step, answer);

      expect(result.issues.map((issue) => issue.code)).toEqual(['type']);
    },
  );

  it('accepts zero as a present numeric answer', () => {
    const result = AnswerValidation.validate(AnswerFixtures.number(), 0);

    expect(result).toEqual({ valid: true, issues: [] });
  });

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

  it('preserves numeric issue order and custom messages without leaking between calls', () => {
    const step = AnswerFixtures.number({
      messages: { min: 'Choose a positive amount.', step: '' },
    });

    const invalidResult = AnswerValidation.validate(step, -0.05);
    const validResult = AnswerValidation.validate(step, 0.5);

    expect(invalidResult).toEqual({
      valid: false,
      issues: [
        { code: 'min', message: 'Choose a positive amount.' },
        { code: 'step', message: '' },
      ],
    });
    expect(validResult).toEqual({ valid: true, issues: [] });
  });

  it('reports membership before cardinality and preserves custom messages across both phases', () => {
    const step = AnswerFixtures.selections({ messages: { duplicate: 'Choose each option once.' } });

    const invalidResult = AnswerValidation.validate(step, ['unknown', 'unknown', 'focus']);
    const validResult = AnswerValidation.validate(step, ['focus']);

    expect(invalidResult).toEqual({
      valid: false,
      issues: [
        { code: 'duplicate', message: 'Choose each option once.' },
        { code: 'option', message: 'Select an available option.' },
        { code: 'maxSelections', message: 'Too many selections.' },
      ],
    });
    expect(validResult).toEqual({ valid: true, issues: [] });
  });
});
