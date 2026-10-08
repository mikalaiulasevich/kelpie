export const SessionStorageCompactionMessages = {
  InvalidOptions: 'Invalid session storage compaction options.',
  DatabaseNotReady: 'The database is not ready for session storage compaction.',
  CleanupFailed: 'Session storage compaction and application cleanup both failed.',
  Failed:
    'Session storage compaction failed. Previously completed batches remain committed; the failing batch was rolled back.',
} as const;
