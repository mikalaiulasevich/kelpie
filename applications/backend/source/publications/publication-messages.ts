export const PublicationMessages = {
  InvalidRequest: 'The publication request is invalid.',
  InvalidQuery: 'The pagination query is invalid.',
  MissingFunnel: 'The funnel does not exist.',
  MissingVersion: 'The configuration version does not belong to this funnel.',
  Conflict: 'The operation identifier already represents a different request.',
  StaleRevision: 'The active configuration changed. Reload before retrying.',
  AlreadyActive: 'The requested configuration is already active.',
  NoPreviousVersion: 'There is no previous activation to restore.',
  InvalidStoredConfiguration:
    'The stored configuration failed validation or integrity verification.',
} as const;
