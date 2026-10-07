import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
import { Kbd, KbdGroup } from '../components/kbd';
import { ActionShortcutCatalog } from '../workspace/action-shortcuts';
import { useActionShortcuts } from '../workspace/use-action-shortcuts';
import { JourneyIllustration } from '../flow-visuals/flow-illustrations';
import { useMemo, useState } from 'react';
import { ChevronDown, RefreshCw, SlidersHorizontal, Radio, Shuffle, Megaphone } from 'lucide-react';
import { LoadErrorState } from '../components/load-error-state';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Sheet, SheetTrigger } from '../components/sheet';
import { AnalyticsVersionPicker } from './analytics-version-picker';
import { SkeletonSummary, SkeletonChart } from '../components/skeleton';
import type { AnalyticsQuery } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsVersionPanel } from './analytics-version-panel';
import { useAnalytics } from './use-analytics';
import { AnalyticsFiltersSheet } from './analytics-filters-sheet';
import { AnalyticsFilterSelection, type AnalyticsFilters } from './analytics-filter-selection';

interface AnalyticsPageProperties {
  readonly funnelIdentifier: string;
  readonly onUnauthorized: () => void;
}

export function AnalyticsPage({ funnelIdentifier, onUnauthorized }: AnalyticsPageProperties) {
  const { t: translate } = useLocalization();

  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(
    AnalyticsFilterSelection.Initial,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const query = useMemo<AnalyticsQuery>(
    () => AnalyticsFilterSelection.query(funnelIdentifier, appliedFilters, 0),
    [funnelIdentifier, appliedFilters],
  );
  const analytics = useAnalytics(query, refreshSequence, onUnauthorized);
  const selectedVersion = analytics.status === 'ready' ? analytics.response.versions[0] : undefined;
  const pendingVersionLabel =
    appliedFilters.versionIdentifier === AnalyticsFilterSelection.Initial.versionIdentifier
      ? translate(AnalyticsContent.LatestVersion)
      : appliedFilters.versionLabel.replace(/^Version (\d+)$/, (_label, version: string) =>
          translate(AnalyticsContent.VersionLabel, { version }),
        );
  const isLoading = analytics.status === 'loading';

  const applyFilters = (filters: AnalyticsFilters) => {
    setAppliedFilters(filters);
    setFiltersOpen(false);
  };

  const openFilters = () => {
    setFiltersOpen(true);
  };

  const refresh = () => setRefreshSequence((sequence) => sequence + 1);

  useActionShortcuts([
    { shortcut: ActionShortcutCatalog.Filters, enabled: true, activate: openFilters },
    { shortcut: ActionShortcutCatalog.Refresh, enabled: !isLoading, activate: refresh },
  ]);

  return (
    <div className="workspace-page flex min-w-0 flex-col gap-8">
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="analytics-toolbar flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="analytics-context-chip" data-tone="traffic">
                <Radio aria-hidden="true" />
                {AnalyticsFilterSelection.trafficLabel(appliedFilters)}
              </Badge>
              <Badge variant="secondary" className="analytics-context-chip">
                <Shuffle aria-hidden="true" />
                {appliedFilters.includeForced
                  ? translate(AnalyticsContent.ForcedIncluded)
                  : translate(AnalyticsContent.ForcedExcluded)}
              </Badge>
              <Badge variant="secondary" className="analytics-context-chip">
                <Megaphone aria-hidden="true" />
                {AnalyticsFilterSelection.campaignLabel(appliedFilters)}
              </Badge>
            </div>
            <div className="flex gap-2">
              <SheetTrigger asChild>
                <Button variant="outline" aria-keyshortcuts={ActionShortcutCatalog.Filters.aria}>
                  <SlidersHorizontal data-icon="inline-start" />
                  {translate(AnalyticsContent.Filters)}
                  <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
                    <Kbd>{'Alt'}</Kbd>
                    <Kbd>{'F'}</Kbd>
                  </KbdGroup>
                </Button>
              </SheetTrigger>
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={refresh}
                aria-keyshortcuts={ActionShortcutCatalog.Refresh.aria}
              >
                <RefreshCw data-icon="inline-start" />
                {translate(AnalyticsContent.Refresh)}
                <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
                  <Kbd>{'Alt'}</Kbd>
                  <Kbd>{'R'}</Kbd>
                </KbdGroup>
              </Button>
            </div>
          </div>
          {appliedFilters.trafficOrigin !== 'production' && (
            <p className="text-xs text-muted-foreground">
              {translate(AnalyticsContent.TestTrafficWarning)}
            </p>
          )}
        </div>
        <AnalyticsFiltersSheet
          onApply={applyFilters}
          appliedFilters={appliedFilters}
          onCancel={() => setFiltersOpen(false)}
        />
      </Sheet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AnalyticsVersionPicker
          funnelIdentifier={funnelIdentifier}
          refreshSequence={refreshSequence}
          selectedIdentifier={
            selectedVersion?.versionIdentifier ?? appliedFilters.versionIdentifier
          }
          selectedLabel={
            selectedVersion
              ? translate(AnalyticsContent.VersionLabel, { version: selectedVersion.funnelVersion })
              : pendingVersionLabel
          }
          onUnauthorized={onUnauthorized}
          onRefresh={refresh}
          onSelect={(versionIdentifier, versionLabel) =>
            setAppliedFilters((current) => ({ ...current, versionIdentifier, versionLabel }))
          }
        />
        {analytics.status === 'ready' && (
          <span className="text-xs text-muted-foreground">
            {translate(AnalyticsContent.Updated)}{' '}
            {AnalyticsFormat.generatedAt(analytics.response.generatedAt)}
          </span>
        )}
      </div>
      {analytics.status === 'loading' && (
        <div
          aria-label={translate(AnalyticsContent.LoadingAnalytics)}
          aria-busy="true"
          className="flex flex-col gap-4"
        >
          <span className="sr-only" role="status">
            {translate(AnalyticsContent.LoadingAnalytics)}
          </span>
          <SkeletonSummary />
          <SkeletonChart />
        </div>
      )}
      {analytics.status === 'failed' && (
        <LoadErrorState
          title={translate(AnalyticsContent.AnalyticsUnavailable)}
          message={analytics.message}
          onRetry={refresh}
          retryLabel={AnalyticsContent.TryAgain}
        />
      )}
      {analytics.status === 'ready' && (
        <>
          {analytics.response.versions.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia>
                  <JourneyIllustration />
                </EmptyMedia>
                <EmptyTitle>{translate(AnalyticsContent.EmptyVersions)}</EmptyTitle>
                <EmptyDescription>
                  {translate(AnalyticsContent.EmptyVersionsDescription)}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={openFilters}>
                <SlidersHorizontal data-icon="inline-start" />
                {translate(AnalyticsContent.AdjustFilters)}
              </Button>
            </Empty>
          ) : (
            <div className="flex min-w-0 flex-col gap-5">
              {selectedVersion && (
                <AnalyticsVersionPanel
                  key={selectedVersion.versionIdentifier}
                  version={selectedVersion}
                  onOpenFilters={openFilters}
                />
              )}
            </div>
          )}
        </>
      )}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {translate(AnalyticsContent.MetricDefinitions)}
            <ChevronDown data-icon="inline-end" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex max-w-3xl flex-col gap-2 text-sm text-muted-foreground">
            <p>{translate(AnalyticsContent.ConversionDefinition)}</p>
            <p>{translate(AnalyticsContent.ComparisonDefinition)}</p>
            <p>{translate(AnalyticsContent.FilterDefinition)}</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
