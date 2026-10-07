export const AnalyticsTrafficOrigin = {
  Production: 'production',
  Synthetic: 'synthetic',
  All: 'all',
} as const;

export const AnalyticsPolicy = {
  Route: 'administration/analytics',
  DefaultLimit: 10,
  MaximumLimit: 20,
  MaximumCampaignLength: 200,
  RateLimit: { max: 30, timeWindow: '1 minute' },
  TransactionTimeout: 10000,
} as const;
