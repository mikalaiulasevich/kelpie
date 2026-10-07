import { useLocalization } from '../localization/use-localization';
import { DeferredView } from '../application/deferred-view';
import { lazy } from 'react';
import { match } from 'ts-pattern';
import { SkeletonRows } from '../components/skeleton';
import { WorkspacePage } from './workspace-navigation';
import type { PublicationIntent } from '../configuration-management/publication-intents';

const AnalyticsPage = lazy(async () => {
  const module = await import('../analytics/analytics-page');

  return { default: module.AnalyticsPage };
});

const ConfigurationVersionsPage = lazy(async () => {
  const module = await import('../configuration-management/configuration-versions-page');

  return { default: module.ConfigurationVersionsPage };
});

const ConfigurationVersionPage = lazy(async () => {
  const module = await import('../configuration-inspection/configuration-version-page');

  return { default: module.ConfigurationVersionPage };
});

const PublicationHistoryPage = lazy(async () => {
  const module = await import('../configuration-management/publication-history-page');

  return { default: module.PublicationHistoryPage };
});

interface WorkspacePageContentProperties {
  page: WorkspacePage;
  funnelIdentifier: string;
  versionIdentifier: Optional<string>;
  revision: number;
  onUnauthorized: () => void;
  onImport: () => void;
  onIntent: (intent: PublicationIntent, returnFocusTarget?: HTMLElement) => void;
}

export function WorkspacePageContent({
  page,
  funnelIdentifier,
  versionIdentifier,
  revision,
  onUnauthorized,
  onImport,
  onIntent,
}: WorkspacePageContentProperties): UIElement {
  useLocalization();

  return (
    <DeferredView key={page} loading={<SkeletonRows label="Opening workspace page" />}>
      {match(page)
        .with(WorkspacePage.Analytics, () => (
          <AnalyticsPage
            key={`${funnelIdentifier}:${revision}`}
            funnelIdentifier={funnelIdentifier}
            onUnauthorized={onUnauthorized}
          />
        ))
        .with(WorkspacePage.Versions, () => (
          <ConfigurationVersionsPage
            key={funnelIdentifier}
            funnelIdentifier={funnelIdentifier}
            revision={revision}
            onUnauthorized={onUnauthorized}
            onImport={onImport}
            onIntent={onIntent}
          />
        ))
        .with(WorkspacePage.Version, () => (
          <ConfigurationVersionPage
            key={versionIdentifier}
            versionIdentifier={versionIdentifier ?? ''}
            funnelIdentifier={funnelIdentifier}
            onUnauthorized={onUnauthorized}
          />
        ))
        .with(WorkspacePage.History, () => (
          <PublicationHistoryPage
            key={funnelIdentifier}
            funnelIdentifier={funnelIdentifier}
            revision={revision}
            onUnauthorized={onUnauthorized}
            onIntent={onIntent}
          />
        ))
        .exhaustive()}
    </DeferredView>
  );
}
