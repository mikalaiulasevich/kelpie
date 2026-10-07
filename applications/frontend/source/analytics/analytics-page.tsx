import { useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
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

  const refresh = () => setRefreshSequence((sequence) => sequence + 1);

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-primary">
            Measure & learn
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Funnel analytics</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Understand every step, compare A/B variants, and see how visitors reach their
            recommendations.
          </p>
        </div>
        <Button variant="outline" disabled={isLoading} onClick={refresh}>
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>
      <AnalyticsFiltersCard
        funnelIdentifier={funnelIdentifier}
        refreshSequence={refreshSequence}
        onUnauthorized={onUnauthorized}
        onApply={applyFilters}
        onRefresh={refresh}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{AnalyticsFilterSelection.trafficLabel(appliedFilters)}</Badge>
        <Badge variant="outline">{appliedFilters.versionLabel}</Badge>
        <Badge variant="outline">
          {appliedFilters.includeForced
            ? 'Forced assignments included'
            : 'Forced assignments excluded'}
        </Badge>
        <Badge variant="outline">{AnalyticsFilterSelection.campaignLabel(appliedFilters)}</Badge>
      </div>
      {appliedFilters.trafficOrigin !== 'production' && (
        <Alert>
          <AlertTitle>
            {appliedFilters.trafficOrigin === 'synthetic'
              ? 'Synthetic traffic selected'
              : 'Production and synthetic traffic combined'}
          </AlertTitle>
          <AlertDescription>
            Synthetic sessions help verify calculations. They do not establish experimental
            effectiveness.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>The experiment hypothesis</CardTitle>
          <CardDescription>
            Variant B increases the share of started sessions opening recommendations through
            improved question order and result framing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            CTA conversion is the primary metric. Result completion and CTA click-through are
            supporting diagnostics. Compare A/B within the same version and experiment; comparisons
            across versions are descriptive.
          </p>
        </CardContent>
      </Card>
      {analytics.status === 'loading' && (
        <div aria-label="Loading analytics" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only" role="status">
            Loading analytics
          </span>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
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
            <span>{analytics.response.versions.length} versions on this page</span>
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
            </Empty>
          ) : (
            <div className="flex min-w-0 flex-col gap-10">
              {analytics.response.versions.map((version) => (
                <AnalyticsVersionPanel key={version.versionIdentifier} version={version} />
              ))}
            </div>
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
    </div>
  );
}
