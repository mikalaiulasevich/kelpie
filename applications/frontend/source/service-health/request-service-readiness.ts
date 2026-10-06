import { isMatching } from 'ts-pattern';
import { ServiceHealthPolicy } from './service-health-policy';
import { ServiceHealthMessages } from './service-health-messages';
import { ServiceHealthStatus } from './service-health';

const ServiceReadinessResponse = {
  isReady: isMatching({ status: ServiceHealthStatus.Ready }),
} as const;

export const ServiceReadiness = {
  async request(cancellationSignal: AbortSignal): Promise<void> {
    const timeoutController = new AbortController();
    const timeoutIdentifier = setTimeout(() => {
      timeoutController.abort(new Error(ServiceHealthMessages.TimedOut));
    }, ServiceHealthPolicy.RequestTimeoutMilliseconds);

    try {
      const response = await fetch(ServiceHealthPolicy.ReadinessEndpoint, {
        signal: AbortSignal.any([cancellationSignal, timeoutController.signal]),
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(ServiceHealthMessages.Unavailable);
      }

      const responseBody: unknown = await response.json();
      if (!ServiceReadinessResponse.isReady(responseBody)) {
        throw new Error(ServiceHealthMessages.InvalidResponse);
      }
    } finally {
      clearTimeout(timeoutIdentifier);
    }
  },
} as const;
