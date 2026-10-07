import { Type, type Static } from 'typebox';
import { match } from 'ts-pattern';
import type { AnalyticsQuery } from '../management/management-types';
import { AnalyticsPagePolicy } from './analytics-policy';

export const AnalyticsFiltersSchema = Type.Object({
  versionIdentifier: Type.String(),
  versionLabel: Type.String(),
  campaign: Type.String({ maxLength: AnalyticsPagePolicy.MaximumCampaignLength }),
  campaignMode: Type.Enum({ All: 'all', Exact: 'exact', None: 'none' } as const),
  trafficOrigin: Type.Enum({
    Production: 'production',
    Synthetic: 'synthetic',
    All: 'all',
  } as const),
  includeForced: Type.Boolean(),
});

export type AnalyticsFilters = Static<typeof AnalyticsFiltersSchema>;

export const AnalyticsFilterSelection = {
  Initial: {
    versionIdentifier: AnalyticsPagePolicy.AllVersionsValue,
    versionLabel: 'All versions',
    campaign: '',
    campaignMode: 'all',
    trafficOrigin: 'production',
    includeForced: false,
  } satisfies AnalyticsFilters,

  query(funnelIdentifier: string, filters: AnalyticsFilters, offset: number): AnalyticsQuery {
    const campaignFilter = match(filters.campaignMode)
      .with('all', () => ({}))
      .with('none', () => ({ campaign: '' }))
      .with('exact', () => ({ campaign: filters.campaign }))
      .exhaustive();

    return {
      funnelIdentifier,
      includeForced: filters.includeForced,
      trafficOrigin: filters.trafficOrigin,
      limit: AnalyticsPagePolicy.VersionsPerPage,
      offset,
      ...(filters.versionIdentifier === AnalyticsPagePolicy.AllVersionsValue
        ? {}
        : { versionIdentifier: filters.versionIdentifier }),
      ...campaignFilter,
    };
  },

  trafficLabel(filters: AnalyticsFilters): string {
    return match(filters.trafficOrigin)
      .with('all', () => 'All traffic')
      .with('synthetic', () => 'Synthetic traffic')
      .with('production', () => 'Production traffic')
      .exhaustive();
  },

  campaignLabel(filters: AnalyticsFilters): string {
    if (filters.campaignMode === 'all') {
      return 'All campaigns';
    }

    const campaign = filters.campaignMode === 'none' ? '' : filters.campaign;

    return `Campaign: ${campaign === '' ? '(empty)' : campaign}`;
  },
} as const;
