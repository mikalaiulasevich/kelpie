import { isNumber } from 'es-toolkit/predicate';
import type { NumberStep, StepAnswer } from '@kelpie/contracts';
import { QuizExperiencePolicy } from './quiz-experience-policy';

export const QuizAnswerInput = {
  toggle(value: StepAnswer | null, option: string): readonly string[] {
    const selected = Array.isArray(value) ? value : [];

    return selected.includes(option)
      ? selected.filter((candidate) => candidate !== option)
      : [...selected, option];
  },

  adjust(step: NumberStep, value: StepAnswer | null, direction: number): number {
    const current = isNumber(value) ? value : step.input.min;
    const adjusted = current + direction * step.input.step;
    const bounded =
      direction < 0 ? Math.max(step.input.min, adjusted) : Math.min(step.input.max, adjusted);

    return Number(bounded.toFixed(QuizExperiencePolicy.NumericAnswerPrecision));
  },
};
