import {
  ServiceHealthStatus,
  type ServiceHealth,
} from '../../source/service-health/service-health';

interface ServiceHealthDetailsCase {
  readonly name: string;
  readonly health: ServiceHealth;
  readonly expectedDescription: string;
}

export const ServiceHealthDetailsCases = {
  PendingOrFailed: [
    {
      name: 'checking',
      health: { status: ServiceHealthStatus.Checking },
      expectedDescription: 'Waiting for a readiness response.',
    },
    {
      name: 'unavailable',
      health: { status: ServiceHealthStatus.Unavailable },
      expectedDescription: 'The readiness check did not succeed. Start the backend and try again.',
    },
  ] satisfies ReadonlyList<ServiceHealthDetailsCase>,
} as const;
