export const BackendTestPolicy = {
  timeoutMilliseconds: 15_000,
  temporaryDirectoryPrefix: 'kelpie-backend-',
  databaseFilename: 'integration.sqlite',
  host: '127.0.0.1',
  ephemeralPort: 0,
  packageManager: 'npm',
  migrationArguments: ['run', 'database:migrate'],
} as const;
