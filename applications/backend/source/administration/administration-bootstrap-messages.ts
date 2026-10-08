export const AdministrationBootstrapMessages = {
  CredentialsRequired:
    'Set valid ADMINISTRATION_USERNAME and ADMINISTRATION_PASSWORD for the first deployment.',
  DatabaseNotReady: 'Apply database migrations before administrator initialization.',
  CleanupFailed: 'Administrator initialization and application cleanup failed.',
  Failed: 'Administrator initialization failed. Check credentials and database readiness.',
} as const;
