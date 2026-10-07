export const AnalyticsTrafficOrigin = {
  Production: 'production',
  Synthetic: 'synthetic',
  All: 'all',
} as const;

export const AnalyticsPolicy = {
  Route: 'administration/analytics',
  DefaultLimit: 10,
  MaximumLimit: 20,
  MaximumOffset: 10000,
  MaximumCampaignLength: 200,
  IdentifierPattern: '^[a-zA-Z0-9_-]+$',
  UnsignedIntegerPattern: '^(0|[1-9][0-9]{0,4})$',
  RateLimit: { max: 30, timeWindow: '1 minute' },
  TransactionTimeout: 10000,
} as const;
