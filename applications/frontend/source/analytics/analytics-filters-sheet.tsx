import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
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
  const { t: translate } = useLocalization();

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
          {translate(AnalyticsContent.FiltersTitle)}
        </SheetTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {translate(AnalyticsContent.FiltersDescription)}
        </p>
      </SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={applyFilters}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <FieldGroup className="gap-6">
            <section aria-label={translate(AnalyticsContent.QuickPresets)}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                {translate(AnalyticsContent.QuickPresetsTitle)}
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
                  {translate(AnalyticsContent.Production)}
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
                  {translate(AnalyticsContent.TestTraffic)}
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
                  {translate(AnalyticsContent.Everything)}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {translate(AnalyticsContent.PresetDescription)}
              </p>
            </section>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="analytics-campaign-mode">
                  <Megaphone className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.Campaign)}
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
                      <SelectItem value="all">
                        {translate(AnalyticsContent.AllCampaigns)}
                      </SelectItem>
                      <SelectItem value="exact">
                        {translate(AnalyticsContent.SpecificCampaign)}
                      </SelectItem>
                      <SelectItem value="none">{translate(AnalyticsContent.NoCampaign)}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {translate(AnalyticsContent.CampaignDescription)}
                </p>
              </Field>
              {draftFilters.campaignMode === 'exact' && (
                <Field>
                  <FieldLabel htmlFor="analytics-campaign">
                    {translate(AnalyticsContent.CampaignName)}
                  </FieldLabel>
                  <Input
                    id="analytics-campaign"
                    placeholder={translate(AnalyticsContent.CampaignPlaceholder)}
                    required
                    autoComplete="off"
                    maxLength={AnalyticsPagePolicy.MaximumCampaignLength}
                    value={draftFilters.campaign}
                    onChange={(event) =>
                      setDraftFilters((filters) => ({ ...filters, campaign: event.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {translate(AnalyticsContent.CampaignExactValue)}
                  </p>
                </Field>
              )}
            </FieldGroup>
            <FieldSet className="gap-5">
              <FieldLegend variant="label" className="mb-0 text-muted-foreground">
                {translate(AnalyticsContent.Sessions)}
              </FieldLegend>
              <Field>
                <FieldLabel id="analytics-origin-label">
                  <Radio className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.TrafficOrigin)}
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
                  <ToggleGroupItem value="production">
                    {translate(AnalyticsContent.Production)}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="synthetic">
                    {translate(AnalyticsContent.Synthetic)}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" aria-label={translate(AnalyticsContent.AllTraffic)}>
                    {translate(AnalyticsContent.All)}
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {draftFilters.trafficOrigin === 'production'
                    ? translate(AnalyticsContent.ProductionDescription)
                    : translate(AnalyticsContent.TestTrafficDescription)}
                </p>
              </Field>
              <Field>
                <FieldLabel id="analytics-forced-label">
                  <Shuffle className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.ForcedAssignments)}
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
                  <ToggleGroupItem value="exclude">
                    {translate(AnalyticsContent.Exclude)}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="include">
                    {translate(AnalyticsContent.Include)}
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {translate(AnalyticsContent.ForcedAssignmentsDescription)}
                </p>
              </Field>
            </FieldSet>
            <section
              className="filter-selection-summary"
              aria-label={translate(AnalyticsContent.SelectedFilters)}
              aria-live="polite"
            >
              <h3 className="text-xs font-medium">{translate(AnalyticsContent.ReportSelection)}</h3>
              <p className="mt-2 text-sm">{AnalyticsFilterSelection.trafficLabel(draftFilters)}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {AnalyticsFilterSelection.campaignLabel(draftFilters)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {draftFilters.includeForced
                  ? translate(AnalyticsContent.ForcedIncluded)
                  : translate(AnalyticsContent.RandomOnly)}
              </p>
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                {translate(AnalyticsContent.ApplyDescription)}
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
            {translate(AnalyticsContent.Reset)}
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
            {translate(AnalyticsContent.Cancel)}
          </Button>
          <Button type="submit" size="sm">
            {translate(AnalyticsContent.ApplyFilters)}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
