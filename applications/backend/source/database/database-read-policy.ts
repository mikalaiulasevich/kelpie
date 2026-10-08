export const DatabaseReadPolicy = {
  TransactionMode: 'read',
  DefaultTimeoutMilliseconds: 5_000,
  MaximumTimeoutMilliseconds: 10_000,
  MaximumStatements: 64,
  // Existing year-long trend queries bind three values per daily bucket.
  MaximumBindingsPerStatement: 2048,
  MaximumRequestBytes: 1_000_000,
  RequestEnvelopeBytes: 1024,
  StatementEnvelopeBytes: 512,
  ArgumentEnvelopeBytes: 64,
  SelectPrefix: /^\s*(?:SELECT|WITH)\b/i,
} as const;
