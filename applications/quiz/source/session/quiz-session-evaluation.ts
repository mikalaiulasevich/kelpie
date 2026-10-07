import { isNull } from 'es-toolkit/predicate';
import { StepRules, type StepAnswer, type SessionAnswers } from '@kelpie/contracts';
import { FunnelEvaluation, type EvaluatedFunnel } from '@kelpie/funnel-runtime';
import type { QuizSessionState } from './quiz-session-types';

export const QuizSessionEvaluation = {
  evaluate(state: QuizSessionState): EvaluatedFunnel {
    const answers: Record<string, StepAnswer> = {};

    for (const answer of state.answers) {
      const step = state.configuration.steps[answer.stepIdentifier];

      if (
        !isNull(answer.confirmationRevision) &&
        !isNull(answer.value) &&
        step &&
        StepRules.isInteractive(step)
      ) {
        Object.defineProperty(answers, step.input.name, { value: answer.value, enumerable: true });
      }
    }

    return FunnelEvaluation.evaluate(
      state.configuration,
      state.variant,
      answers satisfies SessionAnswers,
    );
  },
};
