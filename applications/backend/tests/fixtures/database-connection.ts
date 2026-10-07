import type { Prisma } from '../../generated/prisma/client.js';

import type { SQLiteInteger } from '../../source/database/database-types.js';

interface ConnectionTimeoutRow {
  readonly timeout: SQLiteInteger;
}

interface ConnectionForeignKeysRow {
  readonly foreign_keys: SQLiteInteger;
}

export const DatabaseConnectionFixture = {
  async settings(database: Prisma.TransactionClient) {
    const timeout = await database.$queryRawUnsafe<ConnectionTimeoutRow[]>('PRAGMA busy_timeout');
    const foreignKeys =
      await database.$queryRawUnsafe<ConnectionForeignKeysRow[]>('PRAGMA foreign_keys');
    const journal = await database.$queryRawUnsafe('PRAGMA journal_mode');

    return {
      timeout: timeout.map((row) => Number(row.timeout)),
      foreignKeys: foreignKeys.map((row) => Number(row.foreign_keys)),
      journal,
    };
  },
} as const;
