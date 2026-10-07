import { useMemo, useState, type FormEvent } from 'react';
import { isNull } from 'es-toolkit/predicate';
import { BarChart3, ChevronLeft, ChevronRight, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/field';
import { Input } from '../components/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import { Skeleton } from '../components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '../components/toggle-group';
import type { AnalyticsQuery } from '../management/management-types';
import { ManagementPolicy } from '../management/management-policy';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsPagePolicy } from './analytics-policy';
import { AnalyticsVersionPanel } from './analytics-version-panel';
import { useAnalytics, useAnalyticsVersionOptions } from './use-analytics';

interface AnalyticsPageProperties {
  readonly funnelIdentifier: string;
  readonly onUnauthorized: () => void;
}

interface AnalyticsFilters {
  readonly versionIdentifier: string;
  readonly versionLabel: string;
  readonly campaign: string;
  readonly campaignMode: 'all' | 'exact' | 'none';
  readonly trafficOrigin: 'production' | 'synthetic' | 'all';
  readonly includeForced: boolean;
}

const initialFilters: AnalyticsFilters = {
  versionIdentifier: AnalyticsPagePolicy.AllVersionsValue,
  versionLabel: 'All versions',
  campaign: '',
  campaignMode: 'all',
  trafficOrigin: 'production',
  includeForced: false,
};

export function AnalyticsPage({ funnelIdentifier, onUnauthorized }: AnalyticsPageProperties) {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [offset, setOffset] = useState(0);
  const [versionOptionsOffset, setVersionOptionsOffset] = useState(0);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const query = useMemo<AnalyticsQuery>(
    () => ({
      funnelIdentifier,
      includeForced: appliedFilters.includeForced,
      trafficOrigin: appliedFilters.trafficOrigin,
      limit: AnalyticsPagePolicy.VersionsPerPage,
      offset,
      ...(appliedFilters.versionIdentifier === AnalyticsPagePolicy.AllVersionsValue
        ? {}
        : { versionIdentifier: appliedFilters.versionIdentifier }),
      ...(appliedFilters.campaignMode === 'all'
        ? {}
        : { campaign: appliedFilters.campaignMode === 'none' ? '' : appliedFilters.campaign }),
    }),
    [funnelIdentifier, appliedFilters, offset],
  );
  const versionOptionsQuery = useMemo(
    () => ({
      funnelIdentifier,
      limit: AnalyticsPagePolicy.VersionOptionsPerPage,
      offset: versionOptionsOffset,
    }),
    [funnelIdentifier, versionOptionsOffset],
  );
  const analytics = useAnalytics(query, refreshSequence, onUnauthorized);
  const versionOptions = useAnalyticsVersionOptions(
    versionOptionsQuery,
    refreshSequence,
    onUnauthorized,
  );
  const isLoading = analytics.status === 'loading';

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOffset(0);
    setAppliedFilters({ ...draftFilters });
  };

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
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => setRefreshSequence((sequence) => sequence + 1)}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Cohort filters</CardTitle>
          </div>
          <CardDescription>
            Filters apply to every numerator and denominator. Campaigns use acquisition UTM captured
            once when a session starts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={applyFilters}>
            <FieldGroup className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="analytics-version">Version</FieldLabel>
                <Select
                  value={draftFilters.versionIdentifier}
                  onValueChange={(versionIdentifier) => {
                    const selectedVersion =
                      versionOptions.status === 'ready'
                        ? versionOptions.response.items.find(
                            (version) => version.identifier === versionIdentifier,
                          )
                        : undefined;
                    setDraftFilters((filters) => ({
                      ...filters,
                      versionIdentifier,
                      versionLabel: selectedVersion
                        ? `Version ${selectedVersion.version}`
                        : 'All versions',
                    }));
                  }}
                >
                  <SelectTrigger id="analytics-version" className="w-full">
                    <SelectValue>{draftFilters.versionLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={AnalyticsPagePolicy.AllVersionsValue}>
                        All versions
                      </SelectItem>
                      {versionOptions.status === 'ready' &&
                        versionOptions.response.items.map((version) => (
                          <SelectItem key={version.identifier} value={version.identifier}>
                            Version {version.version}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {versionOptions.status === 'ready' &&
                  (versionOptionsOffset > 0 || !isNull(versionOptions.response.nextOffset)) && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={versionOptionsOffset === 0}
                        onClick={() =>
                          setVersionOptionsOffset((current) =>
                            Math.max(0, current - AnalyticsPagePolicy.VersionOptionsPerPage),
                          )
                        }
                      >
                        Previous choices
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isNull(versionOptions.response.nextOffset)}
                        onClick={() => {
                          const nextOffset = versionOptions.response.nextOffset;

                          if (!isNull(nextOffset)) {
                            setVersionOptionsOffset(nextOffset);
                          }
                        }}
                      >
                        More choices
                      </Button>
                    </div>
                  )}
                {versionOptions.status === 'failed' && (
                  <FieldDescription>
                    {versionOptions.message}{' '}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setRefreshSequence((sequence) => sequence + 1)}
                    >
                      Retry
                    </Button>
                  </FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="analytics-campaign-mode">Campaign matching</FieldLabel>
                <Select
                  value={draftFilters.campaignMode}
                  onValueChange={(campaignMode) => {
                    if (
                      campaignMode === 'all' ||
                      campaignMode === 'exact' ||
                      campaignMode === 'none'
                    ) {
                      setDraftFilters((filters) => ({ ...filters, campaignMode }));
                    }
                  }}
                >
                  <SelectTrigger id="analytics-campaign-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All campaigns</SelectItem>
                      <SelectItem value="exact">Exact campaign</SelectItem>
                      <SelectItem value="none">Empty campaign</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-disabled={draftFilters.campaignMode !== 'exact'}>
                <FieldLabel htmlFor="analytics-campaign">Acquisition campaign</FieldLabel>
                <Input
                  id="analytics-campaign"
                  placeholder="e.g. autumn-launch"
                  maxLength={AnalyticsPagePolicy.MaximumCampaignLength}
                  value={draftFilters.campaign}
                  disabled={draftFilters.campaignMode !== 'exact'}
                  onChange={(event) =>
                    setDraftFilters((filters) => ({ ...filters, campaign: event.target.value }))
                  }
                />
                <FieldDescription>Exact, case-sensitive UTM campaign value.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel id="analytics-origin-label">Traffic origin</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={draftFilters.trafficOrigin}
                  aria-labelledby="analytics-origin-label"
                  onValueChange={(trafficOrigin) => {
                    if (
                      trafficOrigin === 'production' ||
                      trafficOrigin === 'synthetic' ||
                      trafficOrigin === 'all'
                    ) {
                      setDraftFilters((filters) => ({ ...filters, trafficOrigin }));
                    }
                  }}
                >
                  <ToggleGroupItem value="production">Production</ToggleGroupItem>
                  <ToggleGroupItem value="synthetic">Synthetic</ToggleGroupItem>
                  <ToggleGroupItem value="all">All traffic</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel id="analytics-forced-label">Forced assignments</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={draftFilters.includeForced ? 'include' : 'exclude'}
                  aria-labelledby="analytics-forced-label"
                  onValueChange={(selection) => {
                    if (selection === 'include' || selection === 'exclude') {
                      setDraftFilters((filters) => ({
                        ...filters,
                        includeForced: selection === 'include',
                      }));
                    }
                  }}
                >
                  <ToggleGroupItem value="exclude">Exclude</ToggleGroupItem>
                  <ToggleGroupItem value="include">Include</ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>Exclude overrides for the main A/B comparison.</FieldDescription>
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Session counts are deduplicated across repeated views and Back.
              </p>
              <Button type="submit">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {appliedFilters.trafficOrigin === 'all'
            ? 'All traffic'
            : `${appliedFilters.trafficOrigin === 'synthetic' ? 'Synthetic' : 'Production'} traffic`}
        </Badge>
        <Badge variant="outline">{appliedFilters.versionLabel}</Badge>
        <Badge variant="outline">
          {appliedFilters.includeForced
            ? 'Forced assignments included'
            : 'Forced assignments excluded'}
        </Badge>
        <Badge variant="outline">
          {appliedFilters.campaignMode === 'all'
            ? 'All campaigns'
            : `Campaign: ${appliedFilters.campaignMode === 'none' || appliedFilters.campaign === '' ? '(empty)' : appliedFilters.campaign}`}
        </Badge>
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
            <Button
              variant="outline"
              onClick={() => setRefreshSequence((sequence) => sequence + 1)}
            >
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
                  setOffset((current) => current + AnalyticsPagePolicy.VersionsPerPage)
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
