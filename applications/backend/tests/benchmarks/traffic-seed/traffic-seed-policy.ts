export const TrafficSeedPolicy = {
  Days: 28,
  MaximumDays: 90,
  DayMilliseconds: 86_400_000,
  MinimumJourneyMilliseconds: 90_000,
  JourneyVariationMilliseconds: 630_000,
  RecentSafetyMilliseconds: 900_000,
  CheckpointFilename: 'seed-checkpoint.json',
  ReportFilename: 'seed-receipt.json',
  LocalDatabase: 'file:applications/backend/data/funnel-runtime.sqlite',
} as const;
