import { useCallback, useState } from 'react';
import { isEqual } from 'es-toolkit/predicate';
import type { FunnelConfiguration } from '@kelpie/contracts';
import { ChevronDown, GitCompareArrows } from 'lucide-react';
import { ManagementClient } from '../management/management-client';
import { useManagementRead } from '../management/use-management-read';
import { useLocalization } from '../localization/use-localization';
import { Button } from '../components/button';
import { ConfigurationJson } from './configuration-json';

interface ConfigurationVersionComparisonProperties {
  readonly configuration: FunnelConfiguration;
  readonly activeVersionIdentifier: string;
  readonly onUnauthorized: () => void;
}

export function ConfigurationVersionComparison(
  properties: ConfigurationVersionComparisonProperties,
): UIElement {
  const { t: translate } = useLocalization();
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border p-4">
      <Button
        variant="ghost"
        className="h-auto min-h-10 w-full justify-start whitespace-normal text-left"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <GitCompareArrows />
        <span>{translate('Compare with active version')}</span>
        <ChevronDown
          className={`ml-auto shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </Button>
      {open && <ConfigurationVersionDifference {...properties} />}
    </section>
  );
}

function ConfigurationVersionDifference({
  configuration,
  activeVersionIdentifier,
  onUnauthorized,
}: ConfigurationVersionComparisonProperties): UIElement {
  const { t: translate } = useLocalization();
  const request = useCallback(
    (signal: AbortSignal) =>
      ManagementClient.configurationDocument(activeVersionIdentifier, signal),
    [activeVersionIdentifier],
  );
  const resource = useManagementRead(activeVersionIdentifier, request, onUnauthorized);

  if (resource.status === 'loading') {
    return <p role="status">{translate('Loading…')}</p>;
  }

  if (resource.status === 'error') {
    return <p role="alert">{translate(resource.message)}</p>;
  }

  const differences = Object.entries(configuration).filter(
    ([key, value]) => !isEqual(value, Reflect.get(resource.data.document, key)),
  );

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {translate('Active version')} {resource.data.version.version} → {translate('Version')}{' '}
        {configuration.version} · {differences.length} {translate('Changed sections')}
      </p>
      {differences.map(([key, value]) => (
        <details key={key} className="analytics-disclosure rounded-md border px-3 py-1">
          <summary className="text-sm font-medium">
            <span className="min-w-0 break-words">{key}</span>
            <ChevronDown className="analytics-disclosure-chevron" aria-hidden="true" />
          </summary>
          <div className="mb-3 mt-2 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-xs text-muted-foreground">{translate('Active version')}</p>
              <ConfigurationJson value={Reflect.get(resource.data.document, key) ?? null} />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs text-muted-foreground">{translate('This version')}</p>
              <ConfigurationJson value={value} />
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
