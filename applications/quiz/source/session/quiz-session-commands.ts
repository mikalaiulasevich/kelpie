import type { StepAnswer } from '@kelpie/contracts';
import { QuizSessionEvaluation } from './quiz-session-evaluation';
import { QuizSessionPolicy } from './quiz-session-policy';
import {
  QuizNavigationDirection,
  type QuizPendingCommand,
  type QuizSessionState,
} from './quiz-session-types';

export const QuizSessionCommands = {
  create(funnelIdentifier: string, query: string): QuizPendingCommand {
    return {
      path: `${QuizSessionPolicy.Create}${query ? `?${query.replace(/^\?/, '')}` : ''}`,
      body: {
        operationIdentifier: crypto.randomUUID(),
        funnelIdentifier,
        clientTimestamp: new Date().toISOString(),
      },
    };
  },

  navigate(
    state: QuizSessionState,
    direction: QuizNavigationDirection,
    answer?: StepAnswer | null,
  ): QuizPendingCommand {
    const step = QuizSessionEvaluation.evaluate(state).route.steps.find(
      (candidate) => candidate.id === state.currentStepIdentifier,
    );
    const submit = direction === QuizNavigationDirection.Continue && step?.type !== 'info';
    const endpoint = submit ? 'answers' : direction;

    return {
      path: `${QuizSessionPolicy.Current}/${endpoint}`,
      sessionIdentifier: state.sessionIdentifier,
      body: {
        operationIdentifier: crypto.randomUUID(),
        expectedSessionRevision: state.revision,
        stepIdentifier: state.currentStepIdentifier,
        clientTimestamp: new Date().toISOString(),
        ...(submit ? { answer: answer ?? null } : {}),
      },
    };
  },
};
