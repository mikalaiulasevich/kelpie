import { useState, type FormEvent } from 'react';
import { SlidersHorizontal, Radio, FlaskConical, Layers3, Megaphone, Shuffle } from 'lucide-react';
import { SheetContent, SheetFooter, SheetHeader, SheetTitle } from '../components/sheet';
import { Button } from '../components/button';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../components/field';
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
import { AnalyticsFilterSelection, type AnalyticsFilters } from './analytics-filter-selection';
import { AnalyticsPagePolicy } from './analytics-policy';

interface AnalyticsFiltersSheetProperties {
  readonly onApply: (filters: AnalyticsFilters) => void;
  readonly onCancel: () => void;
  readonly appliedFilters: AnalyticsFilters;
}

export function AnalyticsFiltersSheet({
  onApply,
  onCancel,
  appliedFilters,
}: AnalyticsFiltersSheetProperties) {
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(appliedFilters);
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(AnalyticsFilterSelection.applyDraft(appliedFilters, draftFilters));
  };

  return (
    <SheetContent
      side="right"
      className="analytics-filter-sheet w-full gap-0 sm:top-4 sm:right-4 sm:bottom-4 sm:h-[calc(100dvh-2rem)] sm:max-w-md sm:rounded-xl sm:border"
      aria-describedby={undefined}
      onOpenAutoFocus={() => setDraftFilters({ ...appliedFilters })}
    >
      <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12">
        <SheetTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          Analytics filters
        </SheetTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Choose which sessions to include in this report.
        </p>
      </SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={applyFilters}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <FieldGroup className="gap-6">
            <section aria-label="Quick presets">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                Quick presets · traffic & assignment
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="filter-preset"
                  aria-pressed={
                    draftFilters.trafficOrigin === 'production' && !draftFilters.includeForced
                  }
                  onClick={() =>
                    setDraftFilters((filters) => ({
                      ...filters,
                      trafficOrigin: 'production',
                      includeForced: false,
                    }))
                  }
                >
                  <Radio />
                  Production
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="filter-preset"
                  aria-pressed={
                    draftFilters.trafficOrigin === 'synthetic' && draftFilters.includeForced
                  }
                  onClick={() =>
                    setDraftFilters((filters) => ({
                      ...filters,
                      trafficOrigin: 'synthetic',
                      includeForced: true,
                    }))
                  }
                >
                  <FlaskConical />
                  Test traffic
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="filter-preset"
                  aria-pressed={draftFilters.trafficOrigin === 'all' && draftFilters.includeForced}
                  onClick={() =>
                    setDraftFilters((filters) => ({
                      ...filters,
                      trafficOrigin: 'all',
                      includeForced: true,
                    }))
                  }
                >
                  <Layers3 />
                  Everything
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Presets keep your campaign selection.
              </p>
            </section>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="analytics-campaign-mode">
                  <Megaphone className="size-3.5" aria-hidden="true" />
                  Campaign
                </FieldLabel>
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
                      <SelectItem value="exact">Specific campaign</SelectItem>
                      <SelectItem value="none">No campaign</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Filter by the session’s utm_campaign value. “No campaign” includes sessions
                  without this value.
                </p>
              </Field>
              {draftFilters.campaignMode === 'exact' && (
                <Field>
                  <FieldLabel htmlFor="analytics-campaign">Campaign name</FieldLabel>
                  <Input
                    id="analytics-campaign"
                    placeholder="e.g. demo-google-search"
                    required
                    autoComplete="off"
                    maxLength={AnalyticsPagePolicy.MaximumCampaignLength}
                    value={draftFilters.campaign}
                    onChange={(event) =>
                      setDraftFilters((filters) => ({ ...filters, campaign: event.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the exact value, including letter case.
                  </p>
                </Field>
              )}
            </FieldGroup>
            <FieldSet className="gap-5">
              <FieldLegend variant="label" className="mb-0 text-muted-foreground">
                Sessions
              </FieldLegend>
              <Field>
                <FieldLabel id="analytics-origin-label">
                  <Radio className="size-3.5" aria-hidden="true" />
                  Traffic origin
                </FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  className="w-full [&>button]:flex-1"
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
                  <ToggleGroupItem value="all" aria-label="All traffic">
                    All
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {draftFilters.trafficOrigin === 'production'
                    ? 'Only sessions marked as production.'
                    : 'Includes synthetic test sessions. Use this view to inspect tracking, not to pick a winning variant.'}
                </p>
              </Field>
              <Field>
                <FieldLabel id="analytics-forced-label">
                  <Shuffle className="size-3.5" aria-hidden="true" />
                  Forced assignments
                </FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  className="w-full [&>button]:flex-1"
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
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Forced sessions select A or B explicitly instead of using random assignment.
                  Exclude them for experiment comparisons.
                </p>
              </Field>
            </FieldSet>
            <section
              className="filter-selection-summary"
              aria-label="Selected filters"
              aria-live="polite"
            >
              <h3 className="text-xs font-medium">Report selection</h3>
              <p className="mt-2 text-sm">{AnalyticsFilterSelection.trafficLabel(draftFilters)}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {AnalyticsFilterSelection.campaignLabel(draftFilters)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {draftFilters.includeForced
                  ? 'Forced assignments included'
                  : 'Random assignments only'}
              </p>
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                The report updates when you apply. Your selected version stays the same.
              </p>
            </section>
          </FieldGroup>
        </div>
        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={() => setDraftFilters({ ...AnalyticsFilterSelection.Initial })}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraftFilters({ ...appliedFilters });
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Apply filters
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
