export const SessionStorageCompactionPolicy = {
  DefaultBatchSize: 100,
  MaximumBatchSize: 100,
  DefaultMaximumRecords: 200_000,
  MaximumRecords: 1_000_000,
  TransactionTimeoutMilliseconds: 30_000,
  FailureExitCode: 1,
} as const;
