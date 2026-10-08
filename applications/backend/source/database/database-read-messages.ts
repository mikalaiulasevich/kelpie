export const DatabaseReadMessages = {
  Unavailable: 'The database read connection is unavailable.',
  SnapshotRequired: 'A database read snapshot is required.',
  ConcurrentSnapshot: 'The database read adapter already owns a snapshot.',
  InvalidStatement: 'A database read batch requires bounded SELECT statements.',
  InvalidBinding: 'A database read statement contains an unsupported parameter.',
  InvalidResult: 'The database read batch returned invalid results.',
  InvalidOptions: 'The database read options are invalid.',
  InitializationCleanupFailed: 'Database read initialization and cleanup both failed.',
} as const;
