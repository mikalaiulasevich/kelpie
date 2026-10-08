import { useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { ManagementError } from '../management/management-error';

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
      await operation(signal);
      if (!signal.aborted) {
        setSequence((value) => value + 1);
        setMessage('Saved.');
        onChanged?.();
      }
    } catch (error) {
      if (!signal.aborted) {
        if (error instanceof ManagementError && error.status === 401) {
          onUnauthorized();
        }

        setMessage(isError(error) ? error.message : 'Unable to save. Retry with the same details.');
      }
    } finally {
      inFlight.current = false;
      if (!signal.aborted) {
        setPending(false);
      }
    }
  };

  return { execute, pending, message, sequence };
}
