export const TrafficSeedMessages = {
  Arguments: 'Use --target=local|remote --run=identifier [--sessions=10000] [--days=28] [--seed=20261008] [--output=directory]. DATABASE_URL selects the destination; remote mode also requires DATABASE_AUTH_TOKEN.',
  Target: 'The selected destination is missing, does not exist, or does not match local/remote mode.',
  Checkpoint: 'This run checkpoint does not match the requested workload. Reuse the original arguments or choose another output directory and run identifier.',
  Source: 'The verified generation report or manifest does not match its retained dataset.',
  Timeline: 'The synthetic timeline contains an invalid timestamp or session lifetime.',
  Failed: 'Synthetic data generation/import failed. Completed batches are retained; retry the same command. No credentials are included in this diagnostic.',
} as const;
