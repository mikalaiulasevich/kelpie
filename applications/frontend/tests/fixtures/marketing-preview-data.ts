import type {
  AnalyticsRatio,
  AnalyticsVariant,
  AnalyticsVersion,
} from '../../source/management/management-types';

export const MarketingPreviewData = {
  ratio(numerator: number, denominator: number): AnalyticsRatio {
    return { numerator, denominator, value: denominator > 0 ? numerator / denominator : null };
  },

  variant(
    variant: 'A' | 'B',
    started: number,
    resultViews: number,
    clicks: number,
  ): AnalyticsVariant {
    return {
      variant,
      started,
      resultCompletion: this.ratio(resultViews, started),
      ctaConversion: this.ratio(clicks, started),
      ctaClickThrough: this.ratio(clicks, resultViews),
      steps: [
        {
          stepIdentifier: 'welcome',
          type: 'info',
          conditional: false,
          reached: started,
          completed: started - 120,
          completion: this.ratio(started - 120, started),
          noncompletion: { open: 40, expired: 80 },
          expiredDropout: this.ratio(80, started - 40),
        },
        {
          stepIdentifier: 'work-preferences',
          type: 'single-select',
          conditional: false,
          reached: started - 120,
          completed: resultViews,
          completion: this.ratio(resultViews, started - 120),
          noncompletion: { open: 200, expired: started - 320 - resultViews },
          expiredDropout: this.ratio(started - 320 - resultViews, started - 320),
        },
        {
          stepIdentifier: 'recommendations',
          type: 'result',
          conditional: false,
          reached: resultViews,
        },
      ],
      edges: [
        {
          fromStepIdentifier: 'welcome',
          toStepIdentifier: 'work-preferences',
          transitions: started - 120,
          observedConversion: this.ratio(started - 120, started),
          branchShare: this.ratio(started - 120, started - 120),
          transitionToView: this.ratio(started - 120, started - 120),
          destinationNonreach: { open: 0, expired: 0 },
        },
      ],
    };
  },

  version(): AnalyticsVersion {
    return {
      versionIdentifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      funnelVersion: 3,
      experimentIdentifier: 'recommendation-order',
      variants: [this.variant('A', 5700, 3500, 1900), this.variant('B', 5580, 3670, 2190)],
    };
  },
};
