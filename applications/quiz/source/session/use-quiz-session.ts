'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import type { StepAnswer } from '@kelpie/contracts';
import { QuizRequestError, QuizSessionApi, QuizPendingStorage } from './quiz-session-api';
import { QuizSessionMessages } from './quiz-session-messages';
import { QuizSessionPolicy } from './quiz-session-policy';
import { QuizObservations } from './quiz-observations';
import type { QuizPendingCommand, QuizSessionState } from './quiz-session-types';

export function useQuizSession() {
  const [state, setState] = useState<QuizSessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const pending = useRef<QuizPendingCommand | null>(null);
  const running = useRef(false);
  const observed = useRef<string | null>(null);

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
    } catch {
      setError(QuizSessionMessages.Network);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void restore();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [restore]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const identity = `${state.sessionIdentifier}:${state.revision}`;

    let flushing = false;
    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = async () => {
      if (flushing) {
        return;
      }

      flushing = true;

      try {
        if (observed.current !== identity) {
          await QuizObservations.view(state);
          if (stopped) {
            return;
          }

          observed.current = identity;
        }

        await QuizObservations.flush(state);
        if (stopped) {
          return;
        }

        attempts = 0;
        setDeliveryError(null);
      } catch (failure) {
        if (stopped) {
          return;
        }

        attempts += 1;
        setDeliveryError(
          isError(failure) && failure.message === QuizSessionMessages.EventRejected
            ? QuizSessionMessages.EventRejected
            : QuizSessionMessages.Delivery,
        );
      } finally {
        flushing = false;
        if (!stopped && attempts < QuizSessionPolicy.MaximumRetryAttempts) {
          const delay = Math.min(
            QuizSessionPolicy.MaximumRetryMilliseconds,
            QuizSessionPolicy.RetryMilliseconds * 2 ** attempts,
          );
          timer = setTimeout(
            () => {
              void flush();
            },
            delay * (1 + Math.random() * QuizSessionPolicy.RetryJitter),
          );
        }
      }
    };

    void flush();
    const online = () => {
      clearTimeout(timer);
      attempts = 0;
      void flush();
    };

    window.addEventListener('online', online);

    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('online', online);
    };
  }, [state]);

  const execute = useCallback(
    async (command: QuizPendingCommand) => {
      if (running.current) {
        return;
      }

      running.current = true;
      pending.current = command;
      try {
        QuizPendingStorage.write(command);
      } catch {
        setDeliveryError(QuizSessionMessages.Storage);
      }

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
        pending.current = null;
        try {
          QuizPendingStorage.write(null);
        } catch {
          setDeliveryError(QuizSessionMessages.Storage);
        }

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
        if (failure instanceof QuizRequestError && failure.status < 500) {
          pending.current = null;
          try {
            QuizPendingStorage.write(null);
          } catch {
            setDeliveryError(QuizSessionMessages.Storage);
          }

          if (failure.status === 409 || failure.status === 401 || failure.status === 410) {
            await restore();
          }

          setError(failure.message);
        } else {
          setError(QuizSessionMessages.Network);
        }
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [restore],
  );

  const start = useCallback(
    async (funnelIdentifier: string, query = '') => {
      if (pending.current) {
        await execute(pending.current);

        return;
      }

      await execute({
        path: `${QuizSessionPolicy.Create}${query ? `?${query.replace(/^\?/, '')}` : ''}`,
        body: {
          operationIdentifier: crypto.randomUUID(),
          funnelIdentifier,
          clientTimestamp: new Date().toISOString(),
        },
      });
    },
    [execute],
  );

  const navigate = useCallback(
    async (direction: 'continue' | 'back', answer?: StepAnswer | null) => {
      if (!state) {
        return;
      }

      if (pending.current) {
        await execute(pending.current);

        return;
      }

      const step = QuizSessionApi.evaluate(state).route.steps.find(
        (candidate) => candidate.id === state.currentStepIdentifier,
      );
      const submit = direction === 'continue' && step?.type !== 'info';
      const endpoint = submit ? 'answers' : direction;
      await execute({
        path: `${QuizSessionPolicy.Current}/${endpoint}`,
        sessionIdentifier: state.sessionIdentifier,
        body: {
          operationIdentifier: crypto.randomUUID(),
          expectedSessionRevision: state.revision,
          stepIdentifier: state.currentStepIdentifier,
          clientTimestamp: new Date().toISOString(),
          ...(submit ? { answer: answer ?? null } : {}),
        },
      });
    },
    [execute, state],
  );

  const recordResultAction = useCallback(async () => {
    if (!state?.result) {
      return;
    }

    try {
      const properties = { result_id: state.result.id, action: state.result.cta.action };
      await QuizObservations.add(state, 'cta_clicked', properties);

      if (state.result.cta.action === 'expand_recommendation') {
        await QuizObservations.add(state, 'recommendation_expanded', {
          ...properties,
          source: 'primary_cta',
        });
      }

      await QuizObservations.flush(state);
    } catch (failure) {
      setDeliveryError(
        isError(failure) && failure.message === QuizSessionMessages.EventRejected
          ? QuizSessionMessages.EventRejected
          : QuizSessionMessages.Delivery,
      );
    }
  }, [state]);

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
    retry: () => (pending.current ? execute(pending.current) : restore()),
  };
}
