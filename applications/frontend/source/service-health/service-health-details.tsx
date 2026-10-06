import { ApplicationPolicy } from '../application-policy';
import { ServiceHealthContent } from './service-health-content';
import { match } from 'ts-pattern';
import { ServiceHealthStatus, type ServiceHealth } from './service-health';

interface ServiceHealthDetailsProperties {
  readonly health: ServiceHealth;
}

export function ServiceHealthDetails({ health }: ServiceHealthDetailsProperties): UINode {
  return match(health)
    .with({ status: ServiceHealthStatus.Checking }, () => ServiceHealthContent.CheckingDescription)
    .with(
      { status: ServiceHealthStatus.Unavailable },
      () => ServiceHealthContent.UnavailableDescription,
    )
    .with({ status: ServiceHealthStatus.Ready }, ({ checkedAt }) => (
      <>
        {ServiceHealthContent.VerifiedAt}
        <time dateTime={checkedAt.toISOString()}>
          {checkedAt.toLocaleTimeString(ApplicationPolicy.locale)}
        </time>
        {ServiceHealthContent.ReadyDescription}
      </>
    ))
    .exhaustive();
}
