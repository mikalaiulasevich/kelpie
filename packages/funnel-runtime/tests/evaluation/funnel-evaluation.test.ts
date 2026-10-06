import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExperimentVariant } from '@kelpie/contracts';
import { AnswerValidation, FunnelRuntime } from '../../source/index.js';
import { EvaluationCases } from '../cases/evaluation-cases.js';
import { EvaluationFixtures } from '../fixtures/evaluation-fixtures.js';
import { RuntimeAnswers, RuntimeFixtures } from '../fixtures/runtime-fixtures.js';

afterEach(() => vi.restoreAllMocks());

describe('combined funnel evaluation', () => {
  it.each(EvaluationCases.Completion)(
    '$name preserves result eligibility and progress',
    (scenario) => {
      const evaluation = FunnelRuntime.Evaluation.evaluate(
        EvaluationFixtures.configuration(scenario.required),
        ExperimentVariant.A,
        EvaluationFixtures.answers(scenario.teamSize),
      );

      expect(evaluation.result !== undefined).toBe(scenario.hasResult);
      expect(evaluation.route.completedQuestionCount).toBe(scenario.completed);
      expect(evaluation.route.activeAnswers['team_size']).toBe(scenario.expectedActiveAnswer);
    },
  );

  it('validates each active answer once when returning both route and result', () => {
    const validate = vi.spyOn(AnswerValidation, 'validate');
    const evaluation = FunnelRuntime.Evaluation.evaluate(
      RuntimeFixtures.configuration(1),
      ExperimentVariant.A,
      RuntimeAnswers.complete(),
    );

    expect(validate).toHaveBeenCalledTimes(6);
    expect(evaluation.route.completedQuestionCount).toBe(6);
    expect(evaluation.result?.id).toBe('balanced');
    expect(evaluation.route.activeAnswers['office_days']).toBeUndefined();
  });
});
