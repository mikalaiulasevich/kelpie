import { useLocalization } from '../localization/use-localization';
import { ConfigurationStatus } from '@kelpie/contracts';
import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  FileJson2,
  Globe2,
  Layers3,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { ManagementClient, ManagementError } from '../management/management-client';
import { ManagementMessages } from '../management/management-messages';
import { useManagementRead } from '../management/use-management-read';
import { Button } from '../components/button';
import { LoadErrorState } from '../components/load-error-state';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { SkeletonSummary, SkeletonRows } from '../components/skeleton';
import { Card } from '../components/card';
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
  const { t } = useLocalization();
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
            {t("Back to configurations")}</a>
        </Button>
        <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>
          <RefreshCw data-icon="inline-start" />
          {t("Refresh")}</Button>
      </div>
      {resource.status === 'loading' && (
        <div
          role="status"
          aria-label={t("Loading configuration version")}
          className="flex flex-col gap-5"
        >
          <SkeletonSummary />
          <SkeletonRows />
        </div>
      )}
      {resource.status === 'error' && (
        <LoadErrorState
          title={t("Configuration could not be loaded")}
          message={resource.message}
          onRetry={() => setRefresh((value) => value + 1)}
          retryLabel={t("Try again")}
        />
      )}
      {resource.status === 'ready' && (
        <>
          <Card
            role="region"
            aria-label={t("Version overview")}
            className="configuration-overview min-w-0 gap-0 overflow-hidden py-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-5 p-5 sm:p-6">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-info/20 bg-info/10 text-info">
                  <FileJson2 className="size-5" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h1 className="page-title">
                    {t("Version")}<span className="font-mono">{resource.data.version.version}</span>
                  </h1>
                  <p className="max-w-2xl break-words text-sm leading-relaxed text-muted-foreground">
                    {resource.data.document.title}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                {t("Read-only")}</span>
            </div>
            <div className="flex flex-col gap-3 border-t bg-muted/15 px-5 py-4 sm:px-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
                {[
                  { label: 'Funnel', value: resource.data.version.funnelIdentifier, icon: Layers3 },
                  { label: 'Locale', value: resource.data.document.locale, icon: Globe2 },
                  { label: 'Schema', value: resource.data.version.schemaVersion, icon: FileJson2 },
                  {
                    label: 'Document status',
                    value: (
                      <span
                        className={
                          resource.data.document.status === ConfigurationStatus.Published
                            ? 'inline-flex items-center gap-2 text-success'
                            : 'inline-flex items-center gap-2 text-muted-foreground'
                        }
                      >
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {resource.data.document.status}
                      </span>
                    ),
                    icon: FileJson2,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-col gap-1">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <item.icon className="size-3.5" aria-hidden="true" />
                      {item.label}
                    </dt>
                    <dd className="break-words font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="-ml-2">
                    {t("Technical details")}<ChevronDown data-icon="inline-end" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <dl className="grid min-w-0 gap-3 text-xs sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">{t("Version identifier")}</dt>
                      <dd className="mt-1 break-all font-mono">
                        {resource.data.version.identifier}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">{t("Content fingerprint")}</dt>
                      <dd className="mt-1 break-all font-mono">{resource.data.version.checksum}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("Document status does not indicate which version is live.")}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Card>
          <ConfigurationInspection configuration={resource.data.document} />
        </>
      )}
    </div>
  );
}
