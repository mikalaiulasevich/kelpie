import { AnalyticsContent } from './analytics-content';
import { Localization } from '../localization/localization';
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
    versionLabel: AnalyticsContent.AllVersions,
    campaign: '',
    campaignMode: 'all',
    trafficOrigin: 'production',
    includeForced: false,
  } satisfies AnalyticsFilters,

  applyDraft(applied: AnalyticsFilters, draft: AnalyticsFilters): AnalyticsFilters {
    return {
      ...draft,
      versionIdentifier: applied.versionIdentifier,
      versionLabel: applied.versionLabel,
    };
  },

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
      .with('all', () => Localization.translate(AnalyticsContent.AllTraffic))
      .with('synthetic', () => Localization.translate(AnalyticsContent.SyntheticTraffic))
      .with('production', () => Localization.translate(AnalyticsContent.ProductionTraffic))
      .exhaustive();
  },

  campaignLabel(filters: AnalyticsFilters): string {
    if (filters.campaignMode === 'all') {
      return Localization.translate(AnalyticsContent.AllCampaigns);
    }

    const campaign = filters.campaignMode === 'none' ? '' : filters.campaign;

    return Localization.translate(AnalyticsContent.CampaignLabel, {
      campaign: campaign === '' ? Localization.translate(AnalyticsContent.EmptyCampaign) : campaign,
    });
  },
} as const;
