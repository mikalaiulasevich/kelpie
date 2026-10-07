import { isError } from 'es-toolkit/predicate';
import { QuizSessionMessages } from './quiz-session-messages';
import { QuizSessionPolicy } from './quiz-session-policy';

export class QuizRequestError extends Error {
  constructor(readonly status: number) {
    super(
      status === QuizSessionPolicy.ConflictStatus
        ? QuizSessionMessages.Conflict
        : QuizSessionMessages.Rejected,
    );
  }
}

export const QuizSessionFailures = {
  isRejectedCommand(failure: unknown): failure is QuizRequestError {
    return (
      failure instanceof QuizRequestError && failure.status < QuizSessionPolicy.ServerFailureStatus
    );
  },

  requiresRestore(failure: QuizRequestError): boolean {
    return QuizSessionPolicy.RestoreStatuses.some((status) => status === failure.status);
  },

  deliveryMessage(failure: unknown): string {
    return isError(failure) && failure.message === QuizSessionMessages.EventRejected
      ? QuizSessionMessages.EventRejected
      : QuizSessionMessages.Delivery;
  },
};
