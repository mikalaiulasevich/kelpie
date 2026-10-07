import { FunnelConfigurations } from '@kelpie/contracts';

export const ConfigurationCommandPolicy = {
  MaximumFileBytes: FunnelConfigurations.limits.maximumDocumentBytes,
  Encoding: 'utf8',
  ArgumentOffset: 2,
  FailureExitCode: 1,
} as const;
