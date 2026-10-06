import { isMatching } from 'ts-pattern';
import { ServiceHealthPolicy, ServiceHealthMessages } from './service-health-policy';
import { ServiceHealthStatus } from './service-health';

const isReadyResponse = isMatching({ status: ServiceHealthStatus.Ready });

export const ServiceReadiness = {
  async request(cancellationSignal: AbortSignal): Promise<void> {
    const timeoutController = new AbortController();
    const timeoutIdentifier = setTimeout(() => {
      timeoutController.abort(new Error(ServiceHealthMessages.TimedOut));
    }, ServiceHealthPolicy.requestTimeoutMilliseconds);

    try {
      const response = await fetch(ServiceHealthPolicy.readinessEndpoint, {
        signal: AbortSignal.any([cancellationSignal, timeoutController.signal]),
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(ServiceHealthMessages.Unavailable);
      }

      const responseBody: unknown = await response.json();
      if (!isReadyResponse(responseBody)) {
        throw new Error(ServiceHealthMessages.InvalidResponse);
      }
    } finally {
      clearTimeout(timeoutIdentifier);
    }
  },
} as const;
