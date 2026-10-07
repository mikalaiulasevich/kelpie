import { useCallback, useState } from 'react';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { ManagementClient, ManagementError } from '../management/management-client';
import { ManagementMessages } from '../management/management-messages';
import { useManagementRead } from '../management/use-management-read';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Skeleton } from '../components/skeleton';
import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ConfigurationInspection } from './configuration-inspection';

interface ConfigurationVersionPageProperties {
  versionIdentifier: string;
  funnelIdentifier: string;
  onUnauthorized: () => void;
}

export function ConfigurationVersionPage({
  versionIdentifier,
  funnelIdentifier,
  onUnauthorized,
}: ConfigurationVersionPageProperties): UIElement {
  const [refresh, setRefresh] = useState(0);
  const request = useCallback(
    async (signal: AbortSignal) => {
      const result = await ManagementClient.configurationDocument(versionIdentifier, signal);

      if (result.version.funnelIdentifier !== funnelIdentifier) {
        throw new ManagementError(ManagementMessages.NotFound, 404, 'not_found');
      }

      return result;
    },
    [versionIdentifier, funnelIdentifier],
  );
  const resource = useManagementRead(
    `${versionIdentifier}:${funnelIdentifier}:${refresh}`,
    request,
    onUnauthorized,
  );

  return (
    <div className="workspace-page flex min-w-0 flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <a href={WorkspaceNavigation.href(WorkspacePage.Versions, funnelIdentifier)}>
            <ArrowLeft data-icon="inline-start" />
            Back to configurations
          </a>
        </Button>
        <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>
      {resource.status === 'loading' && (
        <div
          role="status"
          aria-label="Loading configuration version"
          className="flex flex-col gap-5"
        >
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}
      {resource.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Configuration could not be loaded</AlertTitle>
          <AlertDescription>
            {resource.message}
            <Button
              variant="outline"
              className="mt-3 w-fit"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {resource.status === 'ready' && (
        <>
          <div className="flex flex-col gap-3">
            <p className="page-eyebrow">CONFIGURATION INSPECTOR</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="page-title">Version {resource.data.version.version}</h1>
              <Badge variant="secondary">
                <ShieldCheck data-icon="inline-start" />
                Immutable
              </Badge>
            </div>
            <p className="page-description">{resource.data.document.title}</p>
            <p className="text-sm text-muted-foreground">
              Inspect the saved document before choosing what goes live. Viewing this version does
              not activate it.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Document identity</CardTitle>
              <CardDescription>
                Metadata from the backend. The document status describes its source; activation is
                tracked separately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Funnel', value: resource.data.version.funnelIdentifier },
                  { label: 'Schema', value: resource.data.version.schemaVersion },
                  { label: 'Locale', value: resource.data.document.locale },
                  { label: 'Source status', value: resource.data.document.status },
                  { label: 'Version identifier', value: resource.data.version.identifier },
                  { label: 'Content fingerprint', value: resource.data.version.checksum },
                ].map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-col gap-1.5">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="break-all font-mono text-xs">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <ConfigurationInspection configuration={resource.data.document} />
        </>
      )}
    </div>
  );
}
