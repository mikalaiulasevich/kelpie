import type { Prisma } from '../../generated/prisma/client.js';
import type { DatabaseFailureKind } from './database-failure-policy.js';

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

export interface DatabaseFailureDescription {
  readonly kind: ValueOf<typeof DatabaseFailureKind>;
  readonly code: string;
  readonly unavailable: boolean;
}

export interface RemoteMigrationDocument {
  readonly name: string;
  readonly checksum: string;
  readonly statement: string;
}
