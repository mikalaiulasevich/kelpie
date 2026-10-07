import { useCallback, useState } from 'react';
import { ArrowLeft, ChevronDown, RefreshCw } from 'lucide-react';
import { ManagementClient, ManagementError } from '../management/management-client';
import { ManagementMessages } from '../management/management-messages';
import { useManagementRead } from '../management/use-management-read';
import { Button } from '../components/button';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { Skeleton } from '../components/skeleton';
import { Card, CardContent, CardDescription, CardHeader } from '../components/card';
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
    <div className="workspace-page flex min-w-0 flex-col gap-5">
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
          <Card className="min-w-0">
            <CardHeader>
              <h1 className="page-title">Version {resource.data.version.version}</h1>
              <CardDescription>{resource.data.document.title}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                {[
                  { label: 'Funnel', value: resource.data.version.funnelIdentifier },
                  { label: 'Locale', value: resource.data.document.locale },
                  { label: 'Schema', value: resource.data.version.schemaVersion },
                  { label: 'Source status', value: resource.data.document.status },
                ].map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="break-all">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Identifiers
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <dl className="grid min-w-0 gap-3 text-xs sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Version identifier</dt>
                      <dd className="mt-1 break-all font-mono">
                        {resource.data.version.identifier}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Content fingerprint</dt>
                      <dd className="mt-1 break-all font-mono">{resource.data.version.checksum}</dd>
                    </div>
                  </dl>
                </CollapsibleContent>
              </Collapsible>
              <p className="text-xs text-muted-foreground">
                Read-only document. Source status is separate from live activation.
              </p>
            </CardContent>
          </Card>
          <ConfigurationInspection configuration={resource.data.document} />
        </>
      )}
    </div>
  );
}
