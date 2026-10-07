export const DevelopmentPolicy = /** @type {const} */ ({
  // Protect the shared process-launch list from accidental mutation.
  Workspaces: Object.freeze(['@kelpie/backend', '@kelpie/frontend']),
  PackageManager: 'npm',
  DevelopmentArguments: ['run', 'development'],
  BunDevelopmentArguments: ['run', '--filter'],
  BunDevelopmentScript: 'development:bun',
  StandardStreams: 'inherit',
  // Allow the backend ten-second HTTP drain deadline plus time for database cleanup.
  ShutdownTimeoutMilliseconds: 15_000,
  ShutdownInspectionMilliseconds: 100,
  WindowsPlatform: 'win32',
  MissingProcessCode: 'ESRCH',
  GracefulSignal: /** @type {const} */ ('SIGTERM'),
  ForcedSignal: /** @type {const} */ ('SIGKILL'),
  InterruptSignal: /** @type {const} */ ('SIGINT'),
  FailureExitCode: 1,
  InterruptExitCode: 130,
  TerminationExitCode: 143,
});

export const BuildPolicy = /** @type {const} */ ({
  RepositoryRelativePath: '../',
  OutputDirectoryName: 'distribution',
  // Cleanup targets are an immutable allowlist, not caller-provided paths.
  OutputDirectories: Object.freeze([
    'packages/contracts/distribution',
    'packages/funnel-runtime/distribution',
    'applications/backend/distribution',
  ]),
});

export const ConfigurationFiles = /** @type {const} */ ({
  // All integrity consumers must verify the same supplied version set.
  Versions: Object.freeze([1, 2, 3]),
  Directory: '../configurations/',
  ManifestName: 'checksums.json',
  TextEncoding: /** @type {const} */ ('utf8'),
  ChecksumAlgorithm: 'sha256',
  ChecksumEncoding: /** @type {const} */ ('hex'),
  /** @param {number} version */
  fileName(version) {
    return `funnel-v${version}.json`;
  },
});

export const TestLayoutPolicy = /** @type {const} */ ({
  Workspaces: [
    'applications/backend',
    'applications/frontend',
    'packages/contracts',
    'packages/funnel-runtime',
  ],
  IgnoredDirectories: new Set(['node_modules', 'distribution', 'generated', 'coverage']),
  TestFilePattern: /[.-](?:test|spec|fixture|fixtures|case|cases|typecheck)\.[cm]?[jt]sx?$/,
  Directory: 'tests',
});
