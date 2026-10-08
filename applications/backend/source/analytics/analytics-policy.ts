export const AnalyticsTrafficOrigin = {
  Production: 'production',
  Synthetic: 'synthetic',
  All: 'all',
} as const;

export const AnalyticsPolicy = {
  // Bonferroni-adjusted Wilson bounds for two proportions provide conservative 95% joint coverage.
  SimultaneousIntervalZ: 2.241402727604947,
  // Chi-square(1) critical value at alpha 0.001; require adequate expected cells.
  SampleRatioMismatchThreshold: 10.827566170662733,
  MinimumExpectedAllocation: 5,
  Route: 'administration/analytics',
  SessionsRoute: 'sessions',
  MaximumTimelineSegments: 20,
  MaximumTimelineEvents: 200,
  DefaultLimit: 10,
  MaximumLimit: 20,
  MaximumCampaignLength: 200,
  RateLimit: { max: 30, timeWindow: '1 minute' },
  TransactionTimeout: 10000,
  TimestampPattern:
    '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$',
  MaximumPeriodMilliseconds: 367 * 24 * 60 * 60 * 1000,
  MillisecondsPerHour: 60 * 60 * 1000,
  MaximumAcquisitionOptions: 100,
  MaximumInsightGroups: 500,
  CalendarBoundarySearchMilliseconds: 2 * 24 * 60 * 60 * 1000,
  MaximumLocalDayMilliseconds: 26 * 60 * 60 * 1000,
} as const;
