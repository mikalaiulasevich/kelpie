import { describe, expect, it } from 'vitest';
import { QuizAnswerInput } from '../../source/experience/quiz-answer-input';
import { SessionFixtures } from '../fixtures/session-fixtures';

describe('Quiz answer editing', () => {
  it('toggles selections without mutating an unfinished draft', () => {
    const draft = ['remote', 'hybrid'];

    expect(QuizAnswerInput.toggle(draft, 'remote')).toEqual(['hybrid']);
    expect(QuizAnswerInput.toggle(draft, 'office')).toEqual(['remote', 'hybrid', 'office']);
    expect(QuizAnswerInput.toggle(null, 'remote')).toEqual(['remote']);
    expect(draft).toEqual(['remote', 'hybrid']);
  });

  it('bounds numeric adjustments and normalizes decimal arithmetic', () => {
    const step = SessionFixtures.numericStep();

    expect(QuizAnswerInput.adjust(step, null, -1)).toBe(0);
    expect(QuizAnswerInput.adjust(step, 1, 1)).toBe(1);
    expect(QuizAnswerInput.adjust(step, 0.2, 1)).toBe(0.3);
    expect(QuizAnswerInput.adjust(step, 0.3, -1)).toBe(0.2);
  });
});
