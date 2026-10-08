export const DatabaseMessages = {
  MigrationHistoryUnavailable: 'Application migration history is unavailable.',
  ForeignKeysUnavailable: 'SQLite foreign key enforcement is unavailable.',
  UnsupportedMigrationControl: 'A migration contains unsupported transaction control.',
  UnknownRemoteMigration: 'The remote database contains a migration absent from this release.',
  RemoteMigrationMismatch: 'The remote migration history is incomplete or its checksum differs.',
  RemoteMigrationForeignKeys: 'The migrated database contains foreign key violations.',
  RemoteMigrationCleanupFailed: 'Remote migration and rollback both failed.',
  RemoteMigrationRequired: 'Remote migration requires a libSQL database URL.',
  RemoteMigrationFailed: 'Remote database migration failed.',
} as const;
