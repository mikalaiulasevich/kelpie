export const TrafficSeedImportMessages = {
  InvalidRun: 'Synthetic import requires a nonempty run identifier.',
  NonSynthetic: 'Synthetic import source contains real traffic.',
  ProjectionChangedOwner: 'Synthetic projection changed session ownership.',
  MissingVersion: 'Synthetic import target is missing an exact configuration version and checksum.',
  Conflict: 'Synthetic import conflicts with previously imported content. Use the original source and projection to retry.',
} as const;
