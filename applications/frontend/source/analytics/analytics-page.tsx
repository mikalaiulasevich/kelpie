import { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Sheet, SheetTrigger } from '../components/sheet';
import { AnalyticsVersionPicker } from './analytics-version-picker';
import { Skeleton } from '../components/skeleton';
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
      ? 'Latest version'
      : appliedFilters.versionLabel;
  const isLoading = analytics.status === 'loading';

  const applyFilters = (filters: AnalyticsFilters) => {
    setAppliedFilters(filters);
    setFiltersOpen(false);
  };

  const openFilters = () => {
    setFiltersOpen(true);
  };

  const refresh = () => setRefreshSequence((sequence) => sequence + 1);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Explore acquisition, journey completion, and recommendation conversion.
        </p>
      </div>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="analytics-toolbar flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {AnalyticsFilterSelection.trafficLabel(appliedFilters)}
              </Badge>
              <Badge variant="outline">
                {appliedFilters.includeForced
                  ? 'Forced assignments included'
                  : 'Forced assignments excluded'}
              </Badge>
              <Badge variant="outline">
                {AnalyticsFilterSelection.campaignLabel(appliedFilters)}
              </Badge>
            </div>
            <div className="flex gap-2">
              <SheetTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal data-icon="inline-start" />
                  Filters
                </Button>
              </SheetTrigger>
              <Button variant="outline" disabled={isLoading} onClick={refresh}>
                <RefreshCw data-icon="inline-start" />
                Refresh
              </Button>
            </div>
          </div>
          {appliedFilters.trafficOrigin !== 'production' && (
            <p className="text-xs text-muted-foreground">
              Synthetic sessions are included. These data do not establish experimental
              effectiveness.
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
            selectedVersion ? `Version ${selectedVersion.funnelVersion}` : pendingVersionLabel
          }
          onUnauthorized={onUnauthorized}
          onRefresh={refresh}
          onSelect={(versionIdentifier, versionLabel) =>
            setAppliedFilters((current) => ({ ...current, versionIdentifier, versionLabel }))
          }
        />
        {analytics.status === 'ready' && (
          <span className="text-xs text-muted-foreground">
            Updated {AnalyticsFormat.generatedAt(analytics.response.generatedAt)}
          </span>
        )}
      </div>
      {analytics.status === 'loading' && (
        <div aria-label="Loading analytics" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only" role="status">
            Loading analytics
          </span>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}
      {analytics.status === 'failed' && (
        <Alert variant="destructive">
          <AlertTitle>Analytics unavailable</AlertTitle>
          <AlertDescription>
            <p>{analytics.message}</p>
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {analytics.status === 'ready' && (
        <>
          {analytics.response.versions.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3 />
                </EmptyMedia>
                <EmptyTitle>No versions in this cohort</EmptyTitle>
                <EmptyDescription>
                  Try a different version or campaign, or import a configuration to begin measuring
                  this funnel.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={openFilters}>
                <SlidersHorizontal data-icon="inline-start" />
                Adjust filters
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
            Metric definitions
            <ChevronDown data-icon="inline-end" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex max-w-3xl flex-col gap-2 text-sm text-muted-foreground">
            <p>
              CTA conversion is the primary metric. Result completion and CTA click-through are
              supporting diagnostics. Compare A/B within the same version and experiment;
              comparisons across versions are descriptive.
            </p>
            <p>
              Hypothesis: variant B increases the share of started sessions opening recommendations
              through question order and result framing.
            </p>
            <p>
              Filters apply to every numerator and denominator. Campaigns use acquisition UTM
              captured when a session starts. Counts deduplicate repeated views and Back. Exclude
              forced assignments for the main A/B comparison.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
