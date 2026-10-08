import type { AnalyticsReport } from '../../source/analytics/analytics-report-types.js';

export const AnalyticsReportFixture = {
  empty(): AnalyticsReport {
    return {
      summaries: [],
      steps: [],
      edges: [],
      businessOutcomes: [],
      trend: [],
      acquisition: [],
      results: [],
      quality: [],
      stepTimings: [],
    };
  },
} as const;
