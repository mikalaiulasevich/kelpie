import { Else, If, Then } from 'react-if';
import { match, P } from 'ts-pattern';
import { ApplicationPolicy } from '../application/application-policy';
import { ServiceHealthContent } from './service-health-content';
import { ServiceHealthStatus, type ServiceHealth } from './service-health';

interface ServiceHealthDetailsProperties {
  readonly health: ServiceHealth;
}

export function ServiceHealthDetails({ health }: ServiceHealthDetailsProperties): UINode {
  return match(health)
    .with(
      { status: P.union(ServiceHealthStatus.Checking, ServiceHealthStatus.Unavailable) },
      ({ status }) => (
        <If condition={status === ServiceHealthStatus.Checking}>
          <Then>{ServiceHealthContent.CheckingDescription}</Then>
          <Else>{ServiceHealthContent.UnavailableDescription}</Else>
        </If>
      ),
    )
    .with({ status: ServiceHealthStatus.Ready }, ({ checkedAt }) => (
      <>
        {ServiceHealthContent.VerifiedAt}
        <time dateTime={checkedAt.toISOString()}>
          {checkedAt.toLocaleTimeString(ApplicationPolicy.Locale)}
        </time>
        {ServiceHealthContent.ReadyDescription}
      </>
    ))
    .exhaustive();
}
