export const DevelopmentPolicy = Object.freeze({
  workspaces: Object.freeze(['@kelpie/backend', '@kelpie/frontend']),
  shutdownTimeoutMilliseconds: 5_000,
  windowsPlatform: 'win32',
  missingProcessCode: 'ESRCH',
  gracefulSignal: /** @type {const} */ ('SIGTERM'),
  forcedSignal: /** @type {const} */ ('SIGKILL'),
  interruptSignal: /** @type {const} */ ('SIGINT'),
  failureExitCode: 1,
  interruptExitCode: 130,
  terminationExitCode: 143,
});

export const BenchmarkPolicy = Object.freeze({
  complianceOption: 'compliance',
  warmupIterations: 1_000,
  samples: 7,
  configurationIterations: 1_000,
  runtimeIterations: 10_000,
  decimalPlaces: 3,
});

export const BuildPolicy = Object.freeze({
  repositoryRelativePath: '../',
  outputDirectoryName: 'distribution',
  outputDirectories: Object.freeze([
    'packages/contracts/distribution',
    'packages/funnel-runtime/distribution',
    'applications/backend/distribution',
  ]),
});

export const ConfigurationFiles = Object.freeze({
  versions: Object.freeze([1, 2, 3]),
  directory: '../configurations/',
  manifestName: 'checksums.json',
  textEncoding: /** @type {const} */ ('utf8'),
  checksumAlgorithm: 'sha256',
  checksumEncoding: /** @type {const} */ ('hex'),
  /** @param {number} version */
  fileName(version) {
    return `funnel-v${version}.json`;
  },
});
