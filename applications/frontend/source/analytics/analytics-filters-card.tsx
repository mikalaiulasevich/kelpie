import { useMemo, useState, type FormEvent } from 'react';
import { isNull } from 'es-toolkit/predicate';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
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
import { ToggleGroup, ToggleGroupItem } from '../components/toggle-group';
import { ManagementPolicy } from '../management/management-policy';
import { AnalyticsFilterSelection, type AnalyticsFilters } from './analytics-filter-selection';
import { AnalyticsPagePolicy } from './analytics-policy';
import { useAnalyticsVersionOptions } from './use-analytics';

interface AnalyticsFiltersCardProperties {
  readonly funnelIdentifier: string;
  readonly refreshSequence: number;
  readonly onUnauthorized: () => void;
  readonly onApply: (filters: AnalyticsFilters) => void;
  readonly onRefresh: () => void;
}

export function AnalyticsFiltersCard({
  funnelIdentifier,
  refreshSequence,
  onUnauthorized,
  onApply,
  onRefresh,
}: AnalyticsFiltersCardProperties) {
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(
    AnalyticsFilterSelection.Initial,
  );
  const [versionOptionsOffset, setVersionOptionsOffset] = useState(0);
  const versionOptionsQuery = useMemo(
    () => ({
      funnelIdentifier,
      limit: AnalyticsPagePolicy.VersionOptionsPerPage,
      offset: versionOptionsOffset,
    }),
    [funnelIdentifier, versionOptionsOffset],
  );
  const versionOptions = useAnalyticsVersionOptions(
    versionOptionsQuery,
    refreshSequence,
    onUnauthorized,
  );

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({ ...draftFilters });
  };

  return (
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
      <CardContent className="@container/analytics-filters">
        <form className="flex flex-col gap-5" onSubmit={applyFilters}>
          <FieldGroup className="grid grid-cols-1 gap-5 @min-[36rem]/analytics-filters:grid-cols-2 @min-[56rem]/analytics-filters:grid-cols-3">
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
                      disabled={
                        isNull(versionOptions.response.nextOffset) ||
                        versionOptions.response.nextOffset > ManagementPolicy.MaximumOffset
                      }
                      onClick={() => {
                        const nextOffset = versionOptions.response.nextOffset;

                        if (!isNull(nextOffset) && nextOffset <= ManagementPolicy.MaximumOffset) {
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
                  <Button type="button" variant="link" size="sm" onClick={() => onRefresh()}>
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
                spacing={2}
                className="w-full flex-wrap"
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
                spacing={2}
                className="w-full flex-wrap"
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
  );
}
