import type { Options } from 'ky';

export const ManagementPolicy = {
  ConfigurationsEndpoint: '/api/administration/configurations',
  PublicationsEndpoint: '/api/administration/publications',
  RollbacksEndpoint: '/api/administration/rollbacks',
  AnalyticsEndpoint: '/api/administration/analytics',
  RequestTimeoutMilliseconds: 15_000,
  MaximumIssues: 30,
  MaximumIssuePathLength: 500,
  MaximumIssueMessageLength: 500,
  MaximumErrorBodyBytes: 64 * 1024,
  MaximumIdentifierLength: 100,
  MaximumPageSize: 100,
  MaximumAnalyticsPageSize: 20,
  MaximumOffset: 10_000,
  MaximumCampaignLength: 200,
  MaximumRevision: 2147483646,
  IdentifierPattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
  UuidPattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  ErrorCodes: [
    'invalid',
    'conflict',
    'operation_conflict',
    'stale_revision',
    'already_active',
    'no_previous_version',
  ],
} as const;

export const ManagementRequestPolicy = {
  retry: 0,
  timeout: ManagementPolicy.RequestTimeoutMilliseconds,
  totalTimeout: ManagementPolicy.RequestTimeoutMilliseconds,
  credentials: 'same-origin',
  cache: 'no-store',
  throwHttpErrors: false,
} as const satisfies Options;
