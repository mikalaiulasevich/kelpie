import type { AnalyticsFilters } from '../../../source/analytics/analytics-filter-selection';

export const AnalyticsCampaignCases: readonly {
  readonly mode: AnalyticsFilters['campaignMode'];
  readonly campaign: string;
  readonly expectedCampaign: Optional<string>;
  readonly expectedLabel: string;
}[] = [
  {
    mode: 'all',
    campaign: 'ignored-draft',
    expectedCampaign: undefined,
    expectedLabel: 'All campaigns',
  },
  {
    mode: 'none',
    campaign: 'ignored-draft',
    expectedCampaign: '',
    expectedLabel: 'Campaign: (empty)',
  },
  { mode: 'exact', campaign: '', expectedCampaign: '', expectedLabel: 'Campaign: (empty)' },
  {
    mode: 'exact',
    campaign: ' Autumn Launch ',
    expectedCampaign: ' Autumn Launch ',
    expectedLabel: 'Campaign:  Autumn Launch ',
  },
];
