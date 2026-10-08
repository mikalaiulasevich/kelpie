import { Type, type Static } from 'typebox';
import type { Prisma } from '../../generated/prisma/client.js';
import { DatabaseReadPolicy } from './database-read-policy.js';

export const DatabaseReadOptionsSchema = Type.Object(
  {
    timeout: Type.Optional(
      Type.Integer({ minimum: 1, maximum: DatabaseReadPolicy.MaximumTimeoutMilliseconds }),
    ),
  },
  { additionalProperties: false },
);

export type DatabaseReadOptions = Static<typeof DatabaseReadOptionsSchema>;

export type DatabaseReadQuery = (
  statements: readonly Prisma.Sql[],
) => Promise<readonly unknown[][]>;

export interface DatabaseReadSnapshot {
  readonly transaction: Prisma.TransactionClient;
  readonly queryMany: DatabaseReadQuery;
}
