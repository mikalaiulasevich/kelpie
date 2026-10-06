import { match } from 'ts-pattern';
import { ServiceHealthStatus, type ServiceHealth } from './service-health';

interface ServiceHealthDetailsProperties {
  readonly health: ServiceHealth;
}

export function ServiceHealthDetails({ health }: ServiceHealthDetailsProperties): UINode {
  return match(health)
    .with({ status: ServiceHealthStatus.Checking }, () => 'Waiting for a readiness response.')
    .with(
      { status: ServiceHealthStatus.Unavailable },
      () => 'The readiness check did not succeed. Start the backend and try again.',
    )
    .with({ status: ServiceHealthStatus.Ready }, ({ checkedAt }) => (
      <>
        Verified at{' '}
        <time dateTime={checkedAt.toISOString()}>{checkedAt.toLocaleTimeString('en-AU')}</time>.
        This check confirms backend readiness only.
      </>
    ))
    .exhaustive();
}
