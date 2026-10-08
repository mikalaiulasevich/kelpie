import type { Prisma } from '../../generated/prisma/client.js';

export type DatabaseAdapter = DefinedPropertyOf<Prisma.PrismaClientOptions, 'adapter'>;

export type SQLiteInteger = number | bigint;

export interface MigrationSummary {
  readonly migration_name: string;
  readonly successful: SQLiteInteger;
  readonly unresolved: SQLiteInteger;
}

export interface SQLiteForeignKeySetting {
  readonly foreign_keys: SQLiteInteger;
}

export const DatabaseErrorCode = { UniqueConstraint: 'P2002', OperationTimeout: 'P1008' } as const;

export interface RemoteMigrationDocument {
  readonly name: string;
  readonly checksum: string;
  readonly statement: string;
}
