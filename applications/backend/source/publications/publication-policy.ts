export const PublicationAction = { Publish: 'publish', Rollback: 'rollback' } as const;
export type PublicationAction = ValueOf<typeof PublicationAction>;

export const PublicationPolicy = {
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
  UniqueConstraintCode: 'P2002',
  DefaultPageSize: 25,
  MaximumPageSize: 100,
  MaximumOffset: 10000,
  MaximumRevision: 2147483646,
  UuidPattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  IdentifierPattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
  Routes: {
    Configurations: 'administration/configurations',
    Publications: 'administration/publications',
    Rollbacks: 'administration/rollbacks',
  },
} as const;

export const PublicationErrorCode = {
  Conflict: 'operation_conflict',
  StaleRevision: 'stale_revision',
  AlreadyActive: 'already_active',
  NoPreviousVersion: 'no_previous_version',
} as const;
