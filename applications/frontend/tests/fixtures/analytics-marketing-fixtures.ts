import type { AnalyticsVariant, AnalyticsVersion } from '../../source/management/management-types';

export const AnalyticsMarketingFixtures = {
  variant(
    variant: AnalyticsVariant['variant'],
    started: number,
    results: number,
    clicks: number,
  ): AnalyticsVariant {
    return {
      variant,
      started,
      resultCompletion: {
        numerator: results,
        denominator: started,
        value: started > 0 ? results / started : null,
      },
      ctaConversion: {
        numerator: clicks,
        denominator: started,
        value: started > 0 ? clicks / started : null,
      },
      ctaClickThrough: {
        numerator: clicks,
        denominator: results,
        value: results > 0 ? clicks / results : null,
      },
      steps: [],
      edges: [],
    };
  },

  version(variants: readonly AnalyticsVariant[]): AnalyticsVersion {
    return {
      versionIdentifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      funnelVersion: 1,
      experimentIdentifier: 'test-experiment',
      variants,
    };
  },
};
