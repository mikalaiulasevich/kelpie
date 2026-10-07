import { useState, type FormEvent } from 'react';
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
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(
    AnalyticsFilterSelection.Initial,
  );
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(AnalyticsFilterSelection.applyDraft(appliedFilters, draftFilters));
  };

  return (
    <SheetContent side="right" className="w-full gap-0 sm:max-w-md" aria-describedby={undefined}>
      <SheetHeader className="border-b px-6 py-5 pr-12">
        <SheetTitle>Analytics filters</SheetTitle>
      </SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={applyFilters}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <FieldGroup className="gap-8">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="analytics-campaign-mode">Campaign</FieldLabel>
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
              </Field>
              {draftFilters.campaignMode === 'exact' && (
                <Field>
                  <FieldLabel htmlFor="analytics-campaign">Campaign name</FieldLabel>
                  <Input
                    id="analytics-campaign"
                    placeholder="Case-sensitive UTM value"
                    maxLength={AnalyticsPagePolicy.MaximumCampaignLength}
                    value={draftFilters.campaign}
                    onChange={(event) =>
                      setDraftFilters((filters) => ({ ...filters, campaign: event.target.value }))
                    }
                  />
                </Field>
              )}
            </FieldGroup>
            <FieldSet className="gap-5">
              <FieldLegend variant="label" className="mb-0 text-muted-foreground">
                Sessions
              </FieldLegend>
              <Field>
                <FieldLabel id="analytics-origin-label">Traffic origin</FieldLabel>
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
              </Field>
              <Field>
                <FieldLabel id="analytics-forced-label">Forced assignments</FieldLabel>
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
              </Field>
            </FieldSet>
          </FieldGroup>
        </div>
        <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
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
