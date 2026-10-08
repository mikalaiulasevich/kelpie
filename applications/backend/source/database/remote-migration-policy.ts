export const RemoteMigrationPolicy = {
  RequestTimeoutMilliseconds: 120_000,
  ChecksumAlgorithm: 'sha256',
  ChecksumEncoding: 'hex',
  MigrationFilename: 'migration.sql',
  // Existing Prisma migrations own these standalone wrappers. The remote runner
  // replaces them with one write transaction and deferred foreign-key validation.
  TransactionWrapper:
    /^\s*(?:BEGIN (?:TRANSACTION|IMMEDIATE);|COMMIT;|PRAGMA (?:defer_foreign_keys|foreign_keys)\s*=\s*(?:ON|OFF);)\s*$/gm,
  ForbiddenControl: /(?:^|;)\s*(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|PRAGMA)\b/i,
} as const;
