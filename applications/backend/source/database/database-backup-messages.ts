import { isError } from 'es-toolkit/predicate';

export const DatabaseBackupMessages = {
  InvalidArguments: 'Supply absolute local --source and --destination file paths.',
  InvalidSource: 'The source must be an existing regular local database file.',
  ExistingDestination: 'The destination already exists; database replacement is forbidden.',
  InvalidDatabase: 'The backup failed integrity, foreign key or migration validation.',
  Failed: 'Database backup or recovery failed. No existing destination was replaced.',
  PublishedCleanupFailed: 'The snapshot was published, but temporary-resource cleanup failed.',
  CleanupFailed: 'Database backup failed and temporary-resource cleanup also failed.',

  failure(error: unknown): string {
    if (isError(error) && error.message === DatabaseBackupMessages.PublishedCleanupFailed) {
      return DatabaseBackupMessages.PublishedCleanupFailed;
    }

    return DatabaseBackupMessages.Failed;
  },
} as const;
