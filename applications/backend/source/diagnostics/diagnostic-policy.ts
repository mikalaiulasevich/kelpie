export const DiagnosticEvents = {
  FrameworkMessage: 'framework_message',
  AdministrationProvisionFailed: 'administration_provision_failed',
  ConfigurationImportFailed: 'configuration_import_failed',
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
  UnknownMethod: 'OTHER',
  UnmatchedRoute: 'unmatched',
  FingerprintAlgorithm: 'sha256',
  FingerprintEncoding: 'hex',
  UnreadableErrorFingerprint: 'unreadable',
  StackLocationPattern: /(.+):(\d+):(\d+)\)?$/,
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
    'P2010',
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

export const DiagnosticSeverity = {
  Information: 'info',
  Debug: 'debug',
  Trace: 'trace',
  Fatal: 'fatal',
  Warning: 'warn',
  Error: 'error',
} as const;

export const DiagnosticEventSeverity = {
  [DiagnosticEvents.FrameworkMessage]: DiagnosticSeverity.Information,
  [DiagnosticEvents.AdministrationProvisionFailed]: DiagnosticSeverity.Error,
  [DiagnosticEvents.ConfigurationImportFailed]: DiagnosticSeverity.Error,
  [DiagnosticEvents.RequestCompleted]: DiagnosticSeverity.Information,
  [DiagnosticEvents.RequestAborted]: DiagnosticSeverity.Warning,
  [DiagnosticEvents.RequestFailed]: DiagnosticSeverity.Error,
  [DiagnosticEvents.ReadinessFailed]: DiagnosticSeverity.Error,
  [DiagnosticEvents.ApplicationStarted]: DiagnosticSeverity.Information,
  [DiagnosticEvents.ApplicationFailed]: DiagnosticSeverity.Error,
  [DiagnosticEvents.ApplicationCleanupFailed]: DiagnosticSeverity.Error,
  [DiagnosticEvents.RecordsDropped]: DiagnosticSeverity.Warning,
  [DiagnosticEvents.ShutdownDeadlineExceeded]: DiagnosticSeverity.Warning,
} as const satisfies ReadonlyDictionary<
  ValueOf<typeof DiagnosticEvents>,
  ValueOf<typeof DiagnosticSeverity>
>;
