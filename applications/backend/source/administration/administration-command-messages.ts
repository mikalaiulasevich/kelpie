export const AdministrationCommandMessages = {
  CredentialsRequired:
    'Set ADMINISTRATION_USERNAME and ADMINISTRATION_PASSWORD before provisioning.',
  DatabaseNotReady: 'Apply database migrations before provisioning an administrator.',
  CleanupFailed: 'Administrator provisioning and application cleanup failed.',
  ProvisionFailed: 'Administrator provisioning failed. Check credentials and database migrations.',
} as const;
