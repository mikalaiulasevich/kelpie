export const DevelopmentPolicy = Object.freeze({
  workspaces: Object.freeze(['@kelpie/backend', '@kelpie/frontend']),
  shutdownTimeoutMilliseconds: 5_000,
  failureExitCode: 1,
  interruptExitCode: 130,
  terminationExitCode: 143,
});

export const BenchmarkPolicy = Object.freeze({
  configurationVersions: Object.freeze([1, 2, 3]),
  warmupIterations: 1_000,
  samples: 7,
  configurationIterations: 1_000,
  runtimeIterations: 10_000,
  decimalPlaces: 3,
});
