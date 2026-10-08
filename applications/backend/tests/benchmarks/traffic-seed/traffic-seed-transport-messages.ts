export const TrafficSeedTransportMessages = {
  ClientRequired: 'Seed transport requires its connected database client.',
  GraphSize: 'Seed transport session graph exceeds its bounded atomic request size.',
  BatchSize: 'Seed transport statement exceeds its bounded request size.',
  RowCount: 'Seed transport did not insert the expected number of rows.',
} as const;
