export const BackendTestPolicy = {
  timeoutMilliseconds: 15_000,
  temporaryDirectoryPrefix: 'kelpie-backend-',
  databaseFilename: 'integration.sqlite',
} as const;
