export const DiagnosticEvents = {
  RequestCompleted: 'request_completed',
  RequestAborted: 'request_aborted',
  RequestFailed: 'request_failed',
  ReadinessFailed: 'readiness_failed',
  ApplicationStarted: 'application_started',
  ApplicationFailed: 'application_failed',
  ApplicationCleanupFailed: 'application_cleanup_failed',
  RecordsDropped: 'records_dropped',
  ShutdownDeadlineExceeded: 'shutdown_deadline_exceeded',
} as const;

export const DiagnosticPolicy = {
  RequestIdentifierHeader: 'x-request-id',
  MaximumStackCharacters: 8_192,
  MaximumFrames: 6,
  FingerprintCharacters: 20,
  Methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  ErrorCodes: [
    'EADDRINUSE',
    'EACCES',
    'ECONNREFUSED',
    'ENOENT',
    'ENOSPC',
    'SQLITE_BUSY',
    'SQLITE_LOCKED',
    'P1001',
    'P1002',
    'P2024',
    'P2021',
    'P2022',
    'P2002',
    'P2003',
  ],
} as const;

export const DiagnosticPhase = {
  Creation: 'creation',
  Listen: 'listen',
  Cleanup: 'cleanup',
} as const;

export const DiagnosticReason = {
  DatabaseQueryFailed: 'database_query_failed',
  MigrationsIncomplete: 'migrations_incomplete',
} as const;

export const ErrorClassification = {
  Error: 'error',
  Unknown: 'unknown',
} as const;
