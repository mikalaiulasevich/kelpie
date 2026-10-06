import { useEffect, useState } from 'react';
import { requestServiceReadiness } from './request-service-readiness';

export type ServiceHealth =
  { status: 'checking' } | { status: 'ready'; checkedAt: Date } | { status: 'unavailable' };

export function useServiceHealth(checkSequence: number): ServiceHealth {
  const [completedCheck, setCompletedCheck] = useState<{
    sequence: number;
    health: ServiceHealth;
  } | null>(null);

  useEffect(() => {
    const cancellationController = new AbortController();
    void requestServiceReadiness(cancellationController.signal).then(
      () => {
        if (!cancellationController.signal.aborted) {
          setCompletedCheck({
            sequence: checkSequence,
            health: { status: 'ready', checkedAt: new Date() },
          });
        }
      },
      () => {
        if (!cancellationController.signal.aborted) {
          setCompletedCheck({ sequence: checkSequence, health: { status: 'unavailable' } });
        }
      },
    );

    return () => cancellationController.abort();
  }, [checkSequence]);

  return completedCheck?.sequence === checkSequence
    ? completedCheck.health
    : { status: 'checking' };
}
