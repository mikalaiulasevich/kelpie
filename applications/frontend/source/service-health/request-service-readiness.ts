import ky, { isTimeoutError } from 'ky';
import { isMatching } from 'ts-pattern';
import { ServiceHealthPolicy, ServiceHealthRequestPolicy } from './service-health-policy';
import { ServiceHealthMessages } from './service-health-messages';
import { ServiceHealthStatus } from './service-health';

const ServiceReadinessResponse = {
  isReady: isMatching({ status: ServiceHealthStatus.Ready }),

  requireSuccess(response: Response): void {
    if (!response.ok) {
      throw new Error(ServiceHealthMessages.Unavailable);
    }
  },
} as const;

export const ServiceReadiness = {
  async request(cancellationSignal: AbortSignal): Promise<void> {
    cancellationSignal.throwIfAborted();
    const endpoint = new URL(ServiceHealthPolicy.ReadinessEndpoint, globalThis.location.origin);

    try {
      const responseBody = await ky
        .get(endpoint, {
          ...ServiceHealthRequestPolicy,
          signal: cancellationSignal,
          hooks: {
            afterResponse: [({ response }) => ServiceReadinessResponse.requireSuccess(response)],
          },
        })
        .json<unknown>();

      if (!ServiceReadinessResponse.isReady(responseBody)) {
        throw new Error(ServiceHealthMessages.InvalidResponse);
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new Error(ServiceHealthMessages.TimedOut, { cause: error });
      }

      throw error;
    }
  },
} as const;
