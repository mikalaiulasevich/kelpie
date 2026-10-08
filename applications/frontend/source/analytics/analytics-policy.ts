export const AnalyticsPagePolicy = {
  VersionsPerPage: 4,
  VersionOptionsPerPage: 100,
  MaximumVersionSearchLength: 200,
  MaximumCampaignLength: 200,
  AllVersionsValue: 'all',
} as const;

export const AnalyticsFormatPolicy = {
  MaximumFractionDigits: 1,
} as const;
