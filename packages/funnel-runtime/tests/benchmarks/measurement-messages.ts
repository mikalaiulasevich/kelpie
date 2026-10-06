export const MeasurementMessages = {
  MnemonistScope:
    'Native versus Mnemonist structure microbenchmarks including construction. Candidate helpers run through tsx; library code is the installed package. Not whole-operation or application throughput.',
  Scope:
    'Compiled pure-function microbenchmarks. Batch averages, not request latency percentiles or application capacity. No timing gate on shared CI.',
  SamplingOrder: 'Rotating case order; each sample is a timed batch average.',
  ChangedInputs:
    'Benchmark source or compiled artifacts changed during measurement; results were not saved.',
  MissingSamples: 'Benchmark measurement requires duration samples.',
  InvalidCase: 'Benchmark cases require positive integer iterations and unique names and sizes.',
  UnknownRevision: 'unavailable',
  Saved: (path: string): string => `Benchmark results saved to ${path}`,
} as const;
