import { useState, type FormEvent } from 'react';
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../components/sheet';
import { Button } from '../components/button';
import { Field, FieldGroup, FieldLabel } from '../components/field';
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
    <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
      <SheetHeader className="border-b p-6">
        <SheetTitle>Analytics filters</SheetTitle>
        <SheetDescription>
          Define the cohort used for every count and conversion rate. Changes take effect when you
          apply.
        </SheetDescription>
      </SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={applyFilters}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <FieldGroup className="gap-6">
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
                    <SelectItem value="exact">Exact campaign</SelectItem>
                    <SelectItem value="none">Empty campaign</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-disabled={draftFilters.campaignMode !== 'exact'}>
              <FieldLabel htmlFor="analytics-campaign">Campaign value</FieldLabel>
              <Input
                id="analytics-campaign"
                placeholder="Case-sensitive UTM value"
                maxLength={AnalyticsPagePolicy.MaximumCampaignLength}
                value={draftFilters.campaign}
                disabled={draftFilters.campaignMode !== 'exact'}
                onChange={(event) =>
                  setDraftFilters((filters) => ({ ...filters, campaign: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel id="analytics-origin-label">Traffic origin</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
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
                spacing={0}
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
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter className="border-t p-6">
          <Button type="submit">Apply filters</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilters({ ...appliedFilters });
                onCancel();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraftFilters({ ...AnalyticsFilterSelection.Initial })}
            >
              Reset draft
            </Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
