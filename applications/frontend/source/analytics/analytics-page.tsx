import { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';
import { Skeleton } from '../components/skeleton';
import type { AnalyticsQuery } from '../management/management-types';
import { ManagementPolicy } from '../management/management-policy';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsPagePolicy } from './analytics-policy';
import { AnalyticsVersionPanel } from './analytics-version-panel';
import { useAnalytics } from './use-analytics';
import { AnalyticsFiltersCard } from './analytics-filters-card';
import { AnalyticsFilterSelection, type AnalyticsFilters } from './analytics-filter-selection';

interface AnalyticsPageProperties {
  readonly funnelIdentifier: string;
  readonly onUnauthorized: () => void;
}

export function AnalyticsPage({ funnelIdentifier, onUnauthorized }: AnalyticsPageProperties) {
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(
    AnalyticsFilterSelection.Initial,
  );
  const [offset, setOffset] = useState(0);
  const [selectedVersionIdentifier, setSelectedVersionIdentifier] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTrigger = useRef<HTMLButtonElement>(null);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const query = useMemo<AnalyticsQuery>(
    () => AnalyticsFilterSelection.query(funnelIdentifier, appliedFilters, offset),
    [funnelIdentifier, appliedFilters, offset],
  );
  const analytics = useAnalytics(query, refreshSequence, onUnauthorized);
  const isLoading = analytics.status === 'loading';

  const applyFilters = (filters: AnalyticsFilters) => {
    setOffset(0);
    setAppliedFilters(filters);
  };

  const openFilters = () => {
    setFiltersOpen(true);
    filtersTrigger.current?.focus();
    filtersTrigger.current?.scrollIntoView({ block: 'nearest' });
  };

  const refresh = () => setRefreshSequence((sequence) => sequence + 1);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Explore acquisition, journey completion, and recommendation conversion.
        </p>
      </div>
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {AnalyticsFilterSelection.trafficLabel(appliedFilters)}
              </Badge>
              <Badge variant="outline">{appliedFilters.versionLabel}</Badge>
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
              <CollapsibleTrigger asChild>
                <Button ref={filtersTrigger} variant="outline" className="group">
                  <SlidersHorizontal data-icon="inline-start" />
                  Filters
                  <ChevronDown
                    data-icon="inline-end"
                    className="group-data-[state=open]:rotate-180"
                  />
                </Button>
              </CollapsibleTrigger>
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
        <AnalyticsFiltersCard
          funnelIdentifier={funnelIdentifier}
          refreshSequence={refreshSequence}
          onUnauthorized={onUnauthorized}
          onApply={applyFilters}
          onRefresh={refresh}
        />
      </Collapsible>
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {analytics.response.versions.length}{' '}
              {analytics.response.versions.length === 1 ? 'version' : 'versions'} on this page
            </span>
            <span>Updated {AnalyticsFormat.generatedAt(analytics.response.generatedAt)}</span>
          </div>
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
            <Tabs
              value={
                analytics.response.versions.some(
                  (version) => version.versionIdentifier === selectedVersionIdentifier,
                )
                  ? selectedVersionIdentifier
                  : (analytics.response.versions[0]?.versionIdentifier ?? '')
              }
              onValueChange={setSelectedVersionIdentifier}
              className="min-w-0 gap-5"
            >
              <TabsList className="h-auto max-w-full flex-wrap" aria-label="Configuration versions">
                {analytics.response.versions.map((version) => (
                  <TabsTrigger key={version.versionIdentifier} value={version.versionIdentifier}>
                    Version {version.funnelVersion}
                    <span className="ml-1 rounded bg-background/60 px-1.5 text-xs tabular-nums">
                      {AnalyticsFormat.count(
                        version.variants.reduce((total, variant) => total + variant.started, 0),
                      )}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {analytics.response.versions.map((version) => (
                <TabsContent key={version.versionIdentifier} value={version.versionIdentifier}>
                  <AnalyticsVersionPanel version={version} onOpenFilters={openFilters} />
                </TabsContent>
              ))}
            </Tabs>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Version page{' '}
              {Math.floor(
                analytics.response.pagination.offset / AnalyticsPagePolicy.VersionsPerPage,
              ) + 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() =>
                  setOffset((current) => Math.max(0, current - AnalyticsPagePolicy.VersionsPerPage))
                }
              >
                <ChevronLeft data-icon="inline-start" />
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={
                  !analytics.response.pagination.hasMore ||
                  offset + AnalyticsPagePolicy.VersionsPerPage > ManagementPolicy.MaximumOffset
                }
                onClick={() =>
                  setOffset((current) => {
                    const nextOffset = current + AnalyticsPagePolicy.VersionsPerPage;

                    return nextOffset <= ManagementPolicy.MaximumOffset ? nextOffset : current;
                  })
                }
              >
                Next
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
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
