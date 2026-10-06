import { useEffect, useState } from 'react';
import { requestServiceReadiness } from './request_service_readiness';
import {
  ServiceHealthStatus,
  type ServiceHealth,
  type CompletedServiceHealthCheck,
} from './service_health';

export function useServiceHealth(checkSequence: number): ServiceHealth {
  const [completedCheck, setCompletedCheck] = useState<CompletedServiceHealthCheck | null>(null);

  useEffect(() => {
    const cancellationController = new AbortController();

    void requestServiceReadiness(cancellationController.signal).then(
      () => {
        if (!cancellationController.signal.aborted) {
          setCompletedCheck({
            sequence: checkSequence,
            health: { status: ServiceHealthStatus.Ready, checkedAt: new Date() },
          });
        }
      },
      () => {
        if (!cancellationController.signal.aborted) {
          setCompletedCheck({
            sequence: checkSequence,
            health: { status: ServiceHealthStatus.Unavailable },
          });
        }
      },
    );

    return () => cancellationController.abort();
  }, [checkSequence]);

  if (completedCheck?.sequence === checkSequence) {
    return completedCheck.health;
  }

  return { status: ServiceHealthStatus.Checking };
}
