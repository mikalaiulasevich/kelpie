'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StepAnswer } from '@kelpie/contracts';
import { QuizSessionApi } from './quiz-session-api';
import { QuizPendingStorage } from './quiz-session-storage';
import { QuizSessionFailures } from './quiz-session-failures';
import { QuizSessionCommands } from './quiz-session-commands';
import { useQuizObservations } from './use-quiz-observations';
import { QuizSessionMessages } from './quiz-session-messages';
import type {
  QuizPendingCommand,
  QuizSessionState,
  QuizNavigationDirection,
  QuizSessionController,
} from './quiz-session-types';

export function useQuizSession(): QuizSessionController {
  const [state, setState] = useState<QuizSessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deliveryError, setDeliveryError, recordResultAction } = useQuizObservations(state);
  const pending = useRef<QuizPendingCommand | null>(null);
  const running = useRef(false);

  const persistPending = useCallback(
    (command: QuizPendingCommand | null) => {
      pending.current = command;
      try {
        QuizPendingStorage.write(command);
      } catch {
        setDeliveryError(QuizSessionMessages.Storage);
      }
    },
    [setDeliveryError],
  );

  const restore = useCallback(async () => {
    try {
      const current = await QuizSessionApi.current();

      try {
        pending.current = QuizPendingStorage.restore(current.state);
      } catch {
        setDeliveryError(QuizSessionMessages.Storage);
      }

      setState(current.state);
      setExpired(current.expired);
      setError(null);

      return current;
    } catch {
      setError(QuizSessionMessages.Network);

      return undefined;
    } finally {
      setLoading(false);
    }
  }, [setDeliveryError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void restore();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [restore]);

  const execute = useCallback(
    async (command: QuizPendingCommand) => {
      if (running.current) {
        return;
      }

      running.current = true;
      persistPending(command);

      setBusy(true);
      setError(null);

      try {
        const updated = await QuizSessionApi.command(command);
        setState((previous) =>
          previous &&
          previous.sessionIdentifier === updated.sessionIdentifier &&
          previous.revision > updated.revision
            ? previous
            : updated,
        );
        const current = await QuizSessionApi.current();
        persistPending(null);

        setState(current.state);
        setExpired(current.expired);

        if (command.path.endsWith('/answers')) {
          try {
            QuizPendingStorage.confirmDraft(updated, command);
          } catch {
            setDeliveryError(QuizSessionMessages.Storage);
          }
        }
      } catch (failure) {
        if (QuizSessionFailures.isRejectedCommand(failure)) {
          persistPending(null);

          if (QuizSessionFailures.requiresRestore(failure)) {
            const restored = await restore();
            setError(QuizSessionFailures.recoveryMessage(failure, restored));
          } else {
            setError(failure.message);
          }
        } else {
          setError(QuizSessionMessages.Network);
        }
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [restore, persistPending, setDeliveryError],
  );

  const start = useCallback(
    async (funnelIdentifier: string, query = '') => {
      if (pending.current) {
        await execute(pending.current);

        return;
      }

      await execute(QuizSessionCommands.create(funnelIdentifier, query));
    },
    [execute],
  );

  const navigate = useCallback(
    async (direction: QuizNavigationDirection, answer?: StepAnswer | null) => {
      if (!state) {
        return;
      }

      if (pending.current) {
        await execute(pending.current);

        return;
      }

      await execute(QuizSessionCommands.navigate(state, direction, answer));
    },
    [execute, state],
  );

  return {
    state,
    loading,
    busy,
    expired,
    error,
    deliveryError,
    start,
    continueStep: (answer?: StepAnswer | null) => navigate('continue', answer),
    back: () => navigate('back'),
    recordResultAction,
    retry: async () => {
      if (pending.current) {
        await execute(pending.current);
      } else {
        await restore();
      }
    },
  };
}
