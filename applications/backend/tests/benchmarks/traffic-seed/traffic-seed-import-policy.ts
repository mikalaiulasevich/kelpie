export const TrafficSeedImportPolicy = {
  BatchSize: 20,
  TransactionTimeoutMilliseconds: 60000,
  Include: { answers: true, operations: true, transitions: true, events: true, version: true },
} as const;
