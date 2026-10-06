export const DiagnosticEvents = {
  RequestCompleted: 'request_completed',
  RequestAborted: 'request_aborted',
  RequestFailed: 'request_failed',
  ReadinessFailed: 'readiness_failed',
  ApplicationStarted: 'application_started',
  ApplicationFailed: 'application_failed',
  ApplicationCleanupFailed: 'application_cleanup_failed',
  RecordsDropped: 'records_dropped',
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
  ],
} as const;
