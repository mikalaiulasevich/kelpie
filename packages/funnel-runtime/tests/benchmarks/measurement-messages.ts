export const MeasurementMessages = {
  ChangedInputs:
    'Benchmark source or compiled artifacts changed during measurement; results were not saved.',
  MissingSamples: 'Benchmark measurement requires duration samples.',
  InvalidCase: 'Benchmark cases require positive integer iterations and unique names and sizes.',
  UnknownRevision: 'unavailable',
  Saved: (path: string): string => `Benchmark results saved to ${path}`,
} as const;
