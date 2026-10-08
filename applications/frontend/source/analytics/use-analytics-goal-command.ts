import { useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { AnalyticsGoalCommand } from './analytics-goal-command';

export function useAnalyticsGoalCommand(onUnauthorized: () => void, onChanged?: () => void) {
  const controller = useRef(new AbortController());
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [sequence, setSequence] = useState(0);
  useEffect(() => {
    const cancellation = new AbortController();
    controller.current = cancellation;

    return () => cancellation.abort();
  }, []);
  const execute = async (operation: (signal: AbortSignal) => Promise<unknown>) => {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setPending(true);
    setMessage('');
    const signal = controller.current.signal;

    try {
      const result = await AnalyticsGoalCommand.run({ operation, signal, onChanged });

      if (signal.aborted) {
        return;
      }

      match(result)
        .with({ status: 'saved' }, ({ message }) => {
          setSequence((value) => value + 1);
          setMessage(message);
        })
        .with({ status: 'failed' }, ({ message }) => setMessage(message))
        .with({ status: 'unauthorized' }, () => onUnauthorized())
        .with({ status: 'cancelled' }, () => undefined)
        .exhaustive();
    } finally {
      inFlight.current = false;
      if (!signal.aborted) {
        setPending(false);
      }
    }
  };

  return { execute, pending, message, sequence };
}
