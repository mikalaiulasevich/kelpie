export const PublicationAction = { Publish: 'publish', Rollback: 'rollback' } as const;
export type PublicationAction = ValueOf<typeof PublicationAction>;

export const PublicationPolicy = {
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
  UniqueConstraintCode: 'P2002',
  MaximumRevision: 2147483646,
  UuidPattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  Routes: {
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
