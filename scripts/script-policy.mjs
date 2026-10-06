export const DevelopmentPolicy = /** @type {const} */ ({
  Workspaces: Object.freeze(['@kelpie/backend', '@kelpie/frontend']),
  ShutdownTimeoutMilliseconds: 5_000,
  WindowsPlatform: 'win32',
  MissingProcessCode: 'ESRCH',
  GracefulSignal: /** @type {const} */ ('SIGTERM'),
  ForcedSignal: /** @type {const} */ ('SIGKILL'),
  InterruptSignal: /** @type {const} */ ('SIGINT'),
  FailureExitCode: 1,
  InterruptExitCode: 130,
  TerminationExitCode: 143,
});

export const BenchmarkPolicy = /** @type {const} */ ({
  ComplianceOption: 'compliance',
  WarmupIterations: 1_000,
  Samples: 7,
  ConfigurationIterations: 1_000,
  RuntimeIterations: 10_000,
  DecimalPlaces: 3,
});

export const BuildPolicy = /** @type {const} */ ({
  RepositoryRelativePath: '../',
  OutputDirectoryName: 'distribution',
  OutputDirectories: Object.freeze([
    'packages/contracts/distribution',
    'packages/funnel-runtime/distribution',
    'applications/backend/distribution',
  ]),
});

export const ConfigurationFiles = /** @type {const} */ ({
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
