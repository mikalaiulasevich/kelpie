import { ServiceHealthContent, ServiceHealthElements } from './service-health-content';
import { useState } from 'react';
import { Button } from '../components/button';
import { ServiceHealthStatus } from './service-health';
import { ServiceHealthDetails } from './service-health-details';
import { useServiceHealth } from './use-service-health';

interface ServiceHealthPresentation {
  readonly label: string;
  readonly indicatorClassName: string;
}

const serviceHealthPresentations: ReadonlyDictionary<
  ServiceHealthStatus,
  ServiceHealthPresentation
> = {
  [ServiceHealthStatus.Checking]: {
    label: ServiceHealthContent.CheckingLabel,
    indicatorClassName: 'bg-slate-400',
  },
  [ServiceHealthStatus.Ready]: {
    label: ServiceHealthContent.ReadyLabel,
    indicatorClassName: 'bg-emerald-600',
  },
  [ServiceHealthStatus.Unavailable]: {
    label: ServiceHealthContent.UnavailableLabel,
    indicatorClassName: 'bg-amber-600',
  },
} as const;

export function ServiceConnection(): UIElement {
  const [checkSequence, setCheckSequence] = useState(0);
  const serviceHealth = useServiceHealth(checkSequence);
  const presentation = serviceHealthPresentations[serviceHealth.status];

  return (
    <section
      aria-labelledby={ServiceHealthElements.HeadingIdentifier}
      className="mt-10 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id={ServiceHealthElements.HeadingIdentifier} className="text-lg font-semibold">
        {ServiceHealthContent.Heading}
      </h2>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-4">
        <p className="flex items-center gap-3 text-sm font-medium">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${presentation.indicatorClassName}`}
          />
          {presentation.label}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          <ServiceHealthDetails health={serviceHealth} />
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-6"
        disabled={serviceHealth.status === ServiceHealthStatus.Checking}
        onClick={() => setCheckSequence((previousSequence) => previousSequence + 1)}
      >
        {ServiceHealthContent.CheckAction}
      </Button>
    </section>
  );
}
