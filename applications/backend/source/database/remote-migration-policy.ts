export const RemoteMigrationPolicy = {
  // A hosted covering index over 219k events took 102 seconds; another attempt exceeded 120.
  // Bound bulk migration requests separately from the 30-second operational request deadline.
  RequestTimeoutMilliseconds: 300_000,
  ChecksumAlgorithm: 'sha256',
  ChecksumEncoding: 'hex',
  MigrationFilename: 'migration.sql',
  // Existing Prisma migrations own these standalone wrappers. The remote runner
  // replaces them with one write transaction and deferred foreign-key validation.
  TransactionWrapper:
    /^\s*(?:BEGIN (?:TRANSACTION|IMMEDIATE);|COMMIT;|PRAGMA (?:defer_foreign_keys|foreign_keys)\s*=\s*(?:ON|OFF);)\s*$/gm,
  ForbiddenControl: /(?:^|;)\s*(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|PRAGMA)\b/i,
} as const;
