import { describe, expect, it } from 'vitest';
import { AnswerValidation } from '../../source/index.js';
import { RuntimeFixtures } from '../fixtures/runtime-fixtures.js';
import { AnswerCases } from '../cases/answer-cases.js';

describe('published configuration answers', () => {
  it.each(AnswerCases.invalidNumbers)('rejects $description for team size', ({ answer }) => {
    expect(AnswerValidation.validate(RuntimeFixtures.step('team_size'), answer).valid).toBe(false);
  });

  it.each(AnswerCases.invalidPriorities)('rejects $description for priorities', ({ answer }) => {
    expect(AnswerValidation.validate(RuntimeFixtures.step('priorities'), answer).valid).toBe(false);
  });

  it('accepts an integer team size within the configured range', () => {
    expect(AnswerValidation.validate(RuntimeFixtures.step('team_size'), 10)).toEqual({
      valid: true,
      issues: [],
    });
  });
});
