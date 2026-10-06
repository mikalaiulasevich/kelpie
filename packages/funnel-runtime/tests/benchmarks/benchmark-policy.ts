export const BenchmarkPolicy = {
  FunnelSizes: [8, 32, 96],
  ConditionSizes: [4, 24],
  HistoricalVersions: [1, 2, 3],
  ReferenceCount: 96,
  ReferenceFunnelSize: 8,
  ComplexIterations: 200,
  SimpleIterations: 3000,
  AnswerValue: 1,
  InvalidAnswer: -1,
} as const;
