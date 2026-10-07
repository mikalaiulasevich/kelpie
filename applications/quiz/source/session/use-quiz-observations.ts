import { useCallback, useEffect, useRef, useState } from 'react';
import { QuizSessionFailures } from './quiz-session-failures';
import { QuizSessionPolicy } from './quiz-session-policy';
import { QuizObservations } from './quiz-observations';
import { QuizObservationDelivery } from './quiz-observation-delivery';
import type { QuizSessionState } from './quiz-session-types';

export function useQuizObservations(state: QuizSessionState | null) {
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const observed = useRef<QuizObservationDelivery | null>(null);

  useEffect(() => {
    if (!state) {
      return;
    }

    if (!observed.current?.matches(state)) {
      observed.current = new QuizObservationDelivery(state);
    }

    const delivery = observed.current;

    let flushing = false;
    let stopped = false;
    let attempts = 0;
    let timer: Optional<ReturnType<typeof setTimeout>>;
    const flush = async () => {
      if (flushing) {
        return;
      }

      flushing = true;

      try {
        await delivery.flush();
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
        setDeliveryError(QuizSessionFailures.deliveryMessage(failure));
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

  const recordResultAction = useCallback(async () => {
    if (!state?.result) {
      return;
    }

    try {
      await QuizObservations.resultAction(state);
      await QuizObservations.flush(state);
    } catch (failure) {
      setDeliveryError(QuizSessionFailures.deliveryMessage(failure));
    }
  }, [state]);

  return { deliveryError, setDeliveryError, recordResultAction };
}
