export interface MigrationSummary {
  readonly migration_name: string;
  readonly successful: bigint;
  readonly unresolved: bigint;
}

export interface SQLiteForeignKeySetting {
  readonly foreign_keys: bigint;
}

export const DatabaseErrorCode = { UniqueConstraint: 'P2002' } as const;
