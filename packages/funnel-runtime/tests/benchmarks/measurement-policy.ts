export const MeasurementPolicy = {
  Samples: 9,
  WarmupIterations: 200,
  NanosecondsPerMillisecond: 1_000_000,
  DecimalPlaces: 3,
  OutputDirectory: 'documentation/benchmarks',
  HistoryFile: 'history.csv',
  LatestFile: 'latest.csv',
  SourceDirectories: [
    'packages/contracts/source',
    'packages/funnel-runtime/source',
    'packages/funnel-runtime/tests',
  ],
  IdentityFiles: [
    'package-lock.json',
    'configurations/funnel-v1.json',
    'configurations/funnel-v2.json',
    'configurations/funnel-v3.json',
    'typescript.base.json',
    'packages/funnel-runtime/tsconfig.build.json',
    'packages/contracts/tsconfig.build.json',
  ],
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
  TextEncoding: 'utf8',
  GitArguments: ['rev-parse', 'HEAD'],
  GitStatusArguments: ['status', '--porcelain'],
  Scope:
    'Compiled pure-function microbenchmarks. Batch averages, not request latency percentiles or application capacity. No timing gate on shared CI.',
  HistoryHeader:
    'run,revision,sourceHash,operation,size,iterations,samples,medianNanosecondsPerOperation,minimumNanosecondsPerOperation,maximumNanosecondsPerOperation',
} as const;
