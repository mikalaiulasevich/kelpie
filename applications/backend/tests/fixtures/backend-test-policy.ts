export const BackendTestPolicy = {
  TimeoutMilliseconds: 15_000,
  // Integration workers also start SQLite servers and migration subprocesses.
  MaximumWorkers: 4,
  TemporaryDirectoryPrefix: 'kelpie-backend-',
  DatabaseFilename: 'integration.sqlite',
  Host: '127.0.0.1',
  EphemeralPort: 0,
  PackageManager: 'npm',
  NodeExecutable: 'node',
  MigrationArguments: ['run', 'database:migrate'],
} as const;
