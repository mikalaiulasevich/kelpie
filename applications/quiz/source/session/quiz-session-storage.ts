import { QuizPreview } from './quiz-preview';
import { isNull, isString, isEqual } from 'es-toolkit/predicate';
import type { StepAnswer } from '@kelpie/contracts';
import {
  QuizSessionValidators,
  type QuizSessionState,
  type QuizPendingCommand,
} from './quiz-session-types';
import { QuizSessionPolicy } from './quiz-session-policy';

export const QuizDrafts = {
  key(state: QuizSessionState, stepIdentifier: string): string {
    return `${QuizSessionPolicy.StoragePrefix}draft.${state.sessionIdentifier}.${state.versionIdentifier}.${stepIdentifier}`;
  },

  read(state: QuizSessionState, stepIdentifier: string): StepAnswer | null | undefined {
    const raw = localStorage.getItem(QuizDrafts.key(state, stepIdentifier));

    if (isNull(raw)) {
      return undefined;
    }

    const value: unknown = JSON.parse(raw);

    return QuizSessionValidators.answer(value) ? value : undefined;
  },

  write(state: QuizSessionState, stepIdentifier: string, value: StepAnswer | null): void {
    localStorage.setItem(QuizDrafts.key(state, stepIdentifier), JSON.stringify(value));
  },

  remove(state: QuizSessionState, stepIdentifier: string): void {
    localStorage.removeItem(QuizDrafts.key(state, stepIdentifier));
  },
};

export const QuizPendingStorage = {
  restore(state: QuizSessionState | null): QuizPendingCommand | null {
    const stored = QuizPendingStorage.read();
    const isCreation =
      stored?.path === QuizSessionPolicy.Create ||
      stored?.path.startsWith(`${QuizSessionPolicy.Create}?`);
    const matches = state
      ? stored?.sessionIdentifier === state.sessionIdentifier &&
        stored.body.expectedSessionRevision === state.revision &&
        stored.body.stepIdentifier === state.currentStepIdentifier
      : isCreation;

    if (!matches) {
      QuizPendingStorage.write(null);

      return null;
    }

    return stored;
  },

  confirmDraft(state: QuizSessionState, command: QuizPendingCommand): void {
    const stepIdentifier = command.body.stepIdentifier;

    if (
      command.path.endsWith('/answers') &&
      isString(stepIdentifier) &&
      command.sessionIdentifier === state.sessionIdentifier &&
      isEqual(QuizDrafts.read(state, stepIdentifier), command.body.answer)
    ) {
      QuizDrafts.remove(state, stepIdentifier);
    }
  },

  read(): QuizPendingCommand | null {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(`${QuizPreview.storagePrefix()}pending`) ?? 'null',
    );

    return QuizSessionValidators.pending(value) ? value : null;
  },

  write(command: QuizPendingCommand | null): void {
    sessionStorage.setItem(`${QuizPreview.storagePrefix()}pending`, JSON.stringify(command));
  },
};
