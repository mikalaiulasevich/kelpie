import type { AnalyticsVersion } from '../../source/management/management-types';

export const AnalyticsPageFixture = {
  emptyVersion(): AnalyticsVersion {
    return {
      versionIdentifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      funnelVersion: 3,
      experimentIdentifier: 'recommendation-order',
      variants: [
        {
          variant: 'A',
          started: 0,
          resultCompletion: { numerator: 0, denominator: 0, value: null },
          ctaConversion: { numerator: 0, denominator: 0, value: null },
          ctaClickThrough: { numerator: 0, denominator: 0, value: null },
          steps: [
            { stepIdentifier: 'recommendations', type: 'result', conditional: false, reached: 0 },
          ],
          edges: [],
        },
      ],
    };
  },

  observedVersion(): AnalyticsVersion {
    return {
      ...this.emptyVersion(),
      variants: [
        {
          variant: 'B',
          started: 8,
          resultCompletion: { numerator: 4, denominator: 8, value: 0.5 },
          ctaConversion: { numerator: 2, denominator: 8, value: 0.25 },
          ctaClickThrough: { numerator: 2, denominator: 4, value: 0.5 },
          steps: [
            { stepIdentifier: 'recommendations', type: 'result', conditional: false, reached: 4 },
          ],
          edges: [],
        },
      ],
    };
  },
} as const;
