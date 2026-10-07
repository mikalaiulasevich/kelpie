export const AnalyticsTrafficOrigin = {
  Production: 'production',
  Synthetic: 'synthetic',
  All: 'all',
} as const;

export const AnalyticsPolicy = {
  Route: 'administration/analytics',
  SessionsRoute: 'sessions',
  MaximumTimelineEvents: 200,
  MaximumTimelineVersions: 1000,
  DefaultLimit: 10,
  MaximumLimit: 20,
  MaximumCampaignLength: 200,
  RateLimit: { max: 30, timeWindow: '1 minute' },
  TransactionTimeout: 10000,
  MaximumPeriodMilliseconds: 366 * 24 * 60 * 60 * 1000,
  MillisecondsPerHour: 60 * 60 * 1000,
  MaximumInsightGroups: 500,
  MaximumLocalDayMilliseconds: 26 * 60 * 60 * 1000,
} as const;
