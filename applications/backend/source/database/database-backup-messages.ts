export const DatabaseBackupMessages = {
  InvalidArguments: 'Supply absolute local --source and --destination file paths.',
  InvalidSource: 'The source must be an existing regular local database file.',
  ExistingDestination: 'The destination already exists; database replacement is forbidden.',
  InvalidDatabase: 'The backup failed integrity, foreign key or migration validation.',
  Failed: 'Database backup or recovery failed. No existing destination was replaced.',
  CleanupFailed: 'Database backup failed and temporary-resource cleanup also failed.',
} as const;
