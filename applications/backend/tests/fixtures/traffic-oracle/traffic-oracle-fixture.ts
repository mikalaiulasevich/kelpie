import type { AnalyticsResponse } from '../../../source/analytics/analytics-response.js';
import type { TrafficSessionManifest } from '../../benchmarks/traffic-oracle/traffic-oracle-types.js';

export const TrafficOracleFixture = {
  response(): AnalyticsResponse {
    return {
      generatedAt: '2026-10-08T00:00:00.000Z',
      filters: {
        funnelIdentifier: 'test-funnel',
        includeForced: true,
        trafficOrigin: 'synthetic',
        limit: 20,
        offset: 0,
      },
      pagination: { limit: 20, offset: 0, hasMore: false },
      versions: [
        {
          versionIdentifier: 'version-one',
          funnelVersion: 1,
          experimentIdentifier: 'experiment',
          variants: [
            {
              variant: 'A',
              started: 3,
              resultCompletion: { numerator: 1, denominator: 3, value: 1 / 3 },
              ctaConversion: { numerator: 2, denominator: 3, value: 2 / 3 },
              ctaClickThrough: { numerator: 1, denominator: 1, value: 1 },
              steps: [
                {
                  stepIdentifier: 'intro',
                  type: 'info',
                  conditional: false,
                  reached: 2,
                  completed: 2,
                  completion: { numerator: 1, denominator: 2, value: 0.5 },
                  noncompletion: { open: 0, expired: 1 },
                  expiredDropout: { numerator: 1, denominator: 1, value: 1 },
                },
                { stepIdentifier: 'result', type: 'result', conditional: false, reached: 1 },
              ],
              edges: [
                {
                  fromStepIdentifier: 'intro',
                  toStepIdentifier: 'result',
                  transitions: 2,
                  observedConversion: { numerator: 1, denominator: 2, value: 0.5 },
                  branchShare: { numerator: 2, denominator: 2, value: 1 },
                  transitionToView: { numerator: 1, denominator: 2, value: 0.5 },
                  destinationNonreach: { open: 0, expired: 1 },
                },
              ],
            },
          ],
        },
      ],
    };
  },

  session(overrides: Partial<TrafficSessionManifest> = {}): TrafficSessionManifest {
    return {
      index: 0,
      sessionIdentifier: 'one',
      versionIdentifier: 'version-one',
      version: 1,
      variant: 'A',
      forced: false,
      acquisition: { source: 'search', medium: 'paid', campaign: 'launch' },
      viewedSteps: ['intro', 'intro', 'result'],
      submittedSteps: ['intro', 'intro'],
      transitions: [{ fromStepIdentifier: 'intro', toStepIdentifier: 'result' }],
      resultIdentifier: 'remote',
      resultViewed: true,
      recommendationClicked: true,
      recommendationExpanded: true,
      completed: true,
      expired: false,
      replayedEvents: 1,
      rejectedEvents: 1,
      backChanges: 0,
      ...overrides,
    };
  },

  manifest(): TrafficSessionManifest[] {
    return [
      TrafficOracleFixture.session(),
      TrafficOracleFixture.session({
        index: 1,
        sessionIdentifier: 'two',
        viewedSteps: [],
        resultViewed: false,
        expired: true,
      }),
      TrafficOracleFixture.session({
        index: 2,
        sessionIdentifier: 'three',
        submittedSteps: [],
        transitions: [],
        viewedSteps: ['intro'],
        resultIdentifier: null,
        resultViewed: false,
        recommendationClicked: false,
        recommendationExpanded: false,
        completed: false,
        expired: true,
      }),
    ];
  },
};
