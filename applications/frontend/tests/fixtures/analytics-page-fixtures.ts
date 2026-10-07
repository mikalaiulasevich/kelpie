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

  tabComparisonVersion(): AnalyticsVersion {
    const version = this.emptyVersion();
    const variant = version.variants[0];

    if (!variant) {
      return version;
    }

    return {
      ...version,
      variants: [
        {
          ...variant,
          steps: [
            ...Array.from({ length: 12 }, (_, index) => ({
              stepIdentifier: `information-${index + 1}`,
              type: 'info' as const,
              conditional: false,
              reached: 0,
              completed: 0,
              completion: { numerator: 0, denominator: 0, value: null },
              noncompletion: { open: 0, expired: 0 },
              expiredDropout: { numerator: 0, denominator: 0, value: null },
            })),
            ...variant.steps,
          ],
        },
        { ...variant, variant: 'B' },
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
