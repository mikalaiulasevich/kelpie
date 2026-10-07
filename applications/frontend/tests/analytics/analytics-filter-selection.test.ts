import { describe, expect, it } from 'vitest';
import { isUndefined } from 'es-toolkit/predicate';
import { AnalyticsFilterSelection } from '../../source/analytics/analytics-filter-selection';
import { AnalyticsCampaignCases } from '../cases/analytics/analytics-filter-cases';

describe('analytics cohort selection', () => {
  it('starts with production traffic, all versions, no campaign constraint and excluded overrides', () => {
    expect(
      AnalyticsFilterSelection.query('workstyle-planner', AnalyticsFilterSelection.Initial, 0),
    ).toEqual({
      funnelIdentifier: 'workstyle-planner',
      includeForced: false,
      trafficOrigin: 'production',
      limit: 4,
      offset: 0,
    });
  });

  it.each(AnalyticsCampaignCases)(
    'preserves $mode campaign boundary for "$campaign"',
    ({ mode, campaign, expectedCampaign, expectedLabel }) => {
      const filters = { ...AnalyticsFilterSelection.Initial, campaignMode: mode, campaign };

      const query = AnalyticsFilterSelection.query('workstyle-planner', filters, 4);

      expect(query.campaign).toBe(expectedCampaign);
      expect(Object.hasOwn(query, 'campaign')).toBe(!isUndefined(expectedCampaign));
      expect(query.offset).toBe(4);
      expect(AnalyticsFilterSelection.campaignLabel(filters)).toBe(expectedLabel);
    },
  );

  it('preserves a pinned version, combined origin and forced assignments without modifying selection', () => {
    const filters = {
      ...AnalyticsFilterSelection.Initial,
      versionIdentifier: '22222222-2222-4222-8222-222222222222',
      versionLabel: 'Version 2',
      includeForced: true,
      trafficOrigin: 'all' as const,
    };
    const originalFilters = { ...filters };

    const query = AnalyticsFilterSelection.query('another-funnel', filters, 8);

    expect(query).toEqual({
      funnelIdentifier: 'another-funnel',
      versionIdentifier: '22222222-2222-4222-8222-222222222222',
      includeForced: true,
      trafficOrigin: 'all',
      limit: 4,
      offset: 8,
    });
    expect(filters).toEqual(originalFilters);
    expect(AnalyticsFilterSelection.trafficLabel(filters)).toBe('All traffic');
  });
});
